from gtts import gTTS
import sys
import os

text = sys.argv[1]
sentences = text.split('.')

file_paths = []
for i, sentence in enumerate(sentences):
    sentence = sentence.strip()
    if sentence:
        filename = f"audios/sentence_{i}.mp3"
        tts = gTTS(sentence, lang='id')
        tts.save(filename)
        file_paths.append(filename)

# Gabungkan semua file jadi generated.mp3
concat_list = '|'.join(file_paths)
os.system(f"ffmpeg -y -i \"concat:{concat_list}\" -acodec copy audios/generated.mp3")

print("Audio generated")
