#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <driver/i2s.h>
#include <ResqVoice_inferencing.h> // Your Edge Impulse Library

// --- WIFI & FIREBASE CONFIGURATION ---
const char* ssid = "C2 Wifi";
const char* password = "94BF4E62";
const char* firebaseUrl = "https://resqvoice-49320-default-rtdb.asia-southeast1.firebasedatabase.app/alerts.json";

// --- I2S MICROPHONE PINS ---
#define I2S_SCK 14
#define I2S_WS 15
#define I2S_SD 32
#define I2S_PORT I2S_NUM_0

// Edge Impulse requires a specific sample rate (usually 16000)
#define SAMPLE_RATE 16000
#define BUFFER_SIZE EI_CLASSIFIER_RAW_SAMPLE_COUNT
int16_t sampleBuffer[BUFFER_SIZE];

// Callback function to convert int16_t to float on-the-fly to save 32KB of RAM
int microphone_audio_signal_get_data(size_t offset, size_t length, float *out_ptr) {
  for (size_t i = 0; i < length; i++) {
    out_ptr[i] = (float)sampleBuffer[offset + i];
  }
  return 0;
}

unsigned long lastAlertTime = 0;

void setup() {
  Serial.begin(115200);
  
  Serial.print("Connecting to Wi-Fi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi Connected!");

  // Initialize Microphone for Edge Impulse
  const i2s_config_t i2s_config = {
    .mode = i2s_mode_t(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT, // Read 32-bit, but we will shift it to 16-bit
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = i2s_comm_format_t(I2S_COMM_FORMAT_STAND_I2S),
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 512,
    .use_apll = false
  };
  
  const i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK, 
    .ws_io_num = I2S_WS, 
    .data_out_num = I2S_PIN_NO_CHANGE, 
    .data_in_num = I2S_SD
  };
  
  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  
  Serial.println("System Armed. Edge Impulse AI Running...");
}

void loop() {
  // 1. Record 1 second of audio into the buffer
  size_t bytes_read = 0;
  int32_t raw_samples[512]; // Temporary 32-bit buffer
  int sample_index = 0;
  int16_t max_amplitude = 0; // Track volume for debugging

  while (sample_index < BUFFER_SIZE) {
    i2s_read(I2S_PORT, &raw_samples, sizeof(raw_samples), &bytes_read, portMAX_DELAY);
    int samples_read = bytes_read / sizeof(int32_t);
    
    for (int i = 0; i < samples_read && sample_index < BUFFER_SIZE; i++) {
      
      // FIXED: Shifted by 16 instead of 14 to stop digital clipping/distortion
      int16_t clean_sample = raw_samples[i] >> 16;
      
      sampleBuffer[sample_index++] = clean_sample;
      
      // Track maximum volume
      if (abs(clean_sample) > max_amplitude) {
        max_amplitude = abs(clean_sample);
      }
    }
  }

  // --- DIAGNOSTIC PRINT 1: MICROPHONE HARDWARE CHECK ---
  Serial.print("Mic Volume: ");
  Serial.print(max_amplitude);

  // 2. Wrap the audio buffer using the memory-saving callback
  signal_t signal;
  signal.total_length = BUFFER_SIZE;
  signal.get_data = &microphone_audio_signal_get_data;

  // 3. Run the AI Classifier
  ei_impulse_result_t result = { 0 };
  int err = run_classifier(&signal, &result, false);
  if (err != EI_IMPULSE_OK) {
    Serial.println(" | Error: Failed to run classifier");
    return;
  }

  // 4. Analyze the AI Results
  String detectedLabel = "";
  float highestConfidence = 0.0;

  for (uint16_t i = 0; i < EI_CLASSIFIER_LABEL_COUNT; i++) {
    if (result.classification[i].value > highestConfidence) {
      highestConfidence = result.classification[i].value;
      detectedLabel = result.classification[i].label;
    }
  }

  // --- DIAGNOSTIC PRINT 2: AI BRAIN CHECK ---
  Serial.print(" | AI heard: ");
  Serial.print(detectedLabel);
  Serial.print(" (");
  Serial.print(highestConfidence * 100);
  Serial.println("%)");

  // 5. Trigger Logic
  if (highestConfidence > 0.80) {
    // Only proceed if 10 seconds have passed since the last alert
    if (millis() - lastAlertTime > 10000) {
      
      // Normalize string case so the IF statements work properly
      detectedLabel.toLowerCase(); 

      if (detectedLabel == "help" || detectedLabel == "saklolo" || detectedLabel == "tulong") {
        Serial.print("\n>>> CRITICAL ALERT SENT: ");
        Serial.println(detectedLabel);
        sendFirebaseAlert("Critical", detectedLabel);
        lastAlertTime = millis();
      } 
      else if (detectedLabel == "scream") {
        Serial.println("\n>>> WARNING ALERT SENT: scream");
        sendFirebaseAlert("Warning", "scream");
        lastAlertTime = millis();
      }
    }
  }
}

// --- FIREBASE API FUNCTION ---
void sendFirebaseAlert(String level, String classification) {
  if (WiFi.status() == WL_CONNECTED) {
    
    WiFiClientSecure client;
    client.setInsecure(); // Bypass SSL certificate validation for ease of testing
    client.setTimeout(10000); // 10 second timeout for HTTPS handshake
    
    HTTPClient http;
    http.begin(client, firebaseUrl); 
    http.addHeader("Content-Type", "application/json");

    // Dynamically inject the severity level into the JSON payload
    String jsonPayload = "{\"level\":\"" + level + "\",\"location\":\"ESP32 Main Unit\",\"classification\":\"" + classification + "\"}";
    
    Serial.println("Sending data to Firebase...");
    int httpResponseCode = http.POST(jsonPayload);
    
    if (httpResponseCode > 0) {
      Serial.print("Success! Firebase Response Code: ");
      Serial.println(httpResponseCode);
    } else {
      Serial.print("Error sending to Firebase: ");
      Serial.println(http.errorToString(httpResponseCode).c_str());
    }
    
    http.end();
    client.stop(); 
    
  } else {
    Serial.println("Error: Wi-Fi disconnected.");
  }
}