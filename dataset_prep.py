import os
import librosa
import soundfile as sf
import numpy as np

# Configuration
INPUT_DIR = "raw_data"
OUTPUT_DIR = "processed_data"
TARGET_SR = 16000             # 16 kHz sample rate (Edge Impulse standard)
TARGET_LENGTH_SEC = 1.0       # 1-second audio clips
TARGET_SAMPLES = int(TARGET_SR * TARGET_LENGTH_SEC) # Exactly 16,000 samples

def process_audio_file(file_path, output_dir, class_name, filename):
    try:
        # Load audio: librosa automatically mixes to mono and resamples to target SR
        y, sr = librosa.load(file_path, sr=TARGET_SR, mono=True)
        
        # Strip trailing silence to isolate the actual sound
        y, _ = librosa.effects.trim(y, top_db=30)
        
        total_samples = len(y)
        
        # SCENARIO A: Audio is shorter than 1 second (e.g., spoken keywords)
        if total_samples < TARGET_SAMPLES:
            # Pad with zeros (silence) to reach exactly 16,000 samples
            pad_length = TARGET_SAMPLES - total_samples
            y_padded = np.pad(y, (0, pad_length), mode='constant')
            
            out_path = os.path.join(output_dir, class_name, f"padded_{filename}")
            sf.write(out_path, y_padded, TARGET_SR, subtype='PCM_16')
            
        # SCENARIO B: Audio is exactly 1 second
        elif total_samples == TARGET_SAMPLES:
            out_path = os.path.join(output_dir, class_name, f"exact_{filename}")
            sf.write(out_path, y, TARGET_SR, subtype='PCM_16')
            
        # SCENARIO C: Audio is longer than 1 second (e.g., ESC-50 screams, RAVDESS crying)
        else:
            # Slice into multiple 1-second chunks to maximize dataset size
            chunks = total_samples // TARGET_SAMPLES
            for i in range(chunks):
                start = i * TARGET_SAMPLES
                end = start + TARGET_SAMPLES
                y_chunk = y[start:end]
                
                out_path = os.path.join(output_dir, class_name, f"chunk{i}_{filename}")
                sf.write(out_path, y_chunk, TARGET_SR, subtype='PCM_16')

    except Exception as e:
        print(f"Error processing {filename}: {e}")

# Run Directory Processing
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# Iterate through each class folder in raw_data
for class_folder in os.listdir(INPUT_DIR):
    class_path = os.path.join(INPUT_DIR, class_folder)
    
    if os.path.isdir(class_path):
        out_class_path = os.path.join(OUTPUT_DIR, class_folder)
        if not os.path.exists(out_class_path):
            os.makedirs(out_class_path)
            
        print(f"Processing class: {class_folder}...")
        
        for file in os.listdir(class_path):
            if file.endswith(('.wav', '.mp3', '.flac', '.ogg')):
                full_path = os.path.join(class_path, file)
                process_audio_file(full_path, OUTPUT_DIR, class_folder, file)

print("Dataset standardization complete. Ready for Edge Impulse.")