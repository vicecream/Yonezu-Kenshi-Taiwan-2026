"""Extract the trial's vocal stem while preserving the original video clock."""
import argparse
import math
import os
from pathlib import Path
import subprocess

import imageio_ffmpeg
import numpy as np
import soundfile as sf
import torch
from scipy.signal import resample_poly


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("work", type=Path)
    args = parser.parse_args()
    os.environ["HF_HOME"] = str(args.work.parent / "models" / "demucs-hf")
    torch.hub.set_dir(str(args.work.parent / "models" / "torch"))
    torch.set_num_threads(min(8, torch.get_num_threads()))
    from demucs.pretrained import get_model
    from demucs.apply import apply_model
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    excerpt = args.work / "excerpt-stereo.wav"
    subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(args.source), "-ss", "8", "-t", "51.01", "-ac", "2", "-ar", "44100", str(excerpt)], check=True)
    print("Loading Demucs htdemucs", flush=True)
    model = get_model("htdemucs")
    audio, sr = sf.read(excerpt, dtype="float32")
    if sr != model.samplerate:
        raise ValueError("Unexpected Demucs sample rate")
    mix = torch.from_numpy(audio.T.copy())
    ref = mix.mean(0)
    mean, std = ref.mean(), ref.std()
    mix = (mix - mean) / std
    with torch.inference_mode():
        sources = apply_model(model, mix[None], device="cpu", shifts=0, split=True, overlap=0.25, progress=True, segment=7)[0]
    vocals = (sources[model.sources.index("vocals")] * std + mean).mean(0).numpy()
    divisor = math.gcd(sr, 16000)
    vocals16 = resample_poly(vocals, 16000 // divisor, sr // divisor)
    sf.write(args.work / "vocal-excerpt.wav", vocals16, 16000)
    sf.write(args.work / "vocal-16k.wav", np.pad(vocals16, (8 * 16000, 0)), 16000)
    subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(args.work / "vocal-excerpt.wav"), "-c:a", "libmp3lame", "-b:a", "160k", str(args.work / "vocal-excerpt.mp3")], check=True)
    print("Vocal excerpt and clock-preserving waveform written", flush=True)


if __name__ == "__main__":
    main()
