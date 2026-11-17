"""Align a 51-second Japanese/English excerpt against the existing LRC.

This is an experiment, not a claim of manually verified timing. Run in an
isolated Python environment with torch, transformers, scipy and soundfile.
Audio and model weights stay outside the website repository.
"""
import argparse
import hashlib
import json
import math
import re
import unicodedata
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from scipy.signal import resample_poly
from transformers import AutoProcessor, Wav2Vec2ForCTC

REPO = Path(__file__).resolve().parents[1]
MODELS = {
    "ja": "jonatasgrosman/wav2vec2-large-xlsr-53-japanese",
    "en": "facebook/wav2vec2-base-960h",
}


def ctc_path(emission, tokens, blank):
    """Viterbi over the full CTC topology, including repeated-token blanks."""
    states = np.full(len(tokens) * 2 + 1, blank, dtype=np.int64)
    states[1::2] = tokens
    count = len(states)
    previous = np.full(count, -np.inf)
    previous[0] = 0
    back = np.zeros((len(emission), count), dtype=np.int8)
    can_skip = (states != blank) & (states != np.roll(states, 2))
    can_skip[:2] = False
    for t, frame in enumerate(emission):
        one = np.concatenate(([-np.inf], previous[:-1]))
        two = np.concatenate(([-np.inf, -np.inf], previous[:-2]))
        two[~can_skip] = -np.inf
        candidates = np.stack((previous, one, two))
        choice = candidates.argmax(axis=0)
        previous = candidates[choice, np.arange(count)] + frame[states]
        back[t] = choice
    state = count - 1 if previous[-1] >= previous[-2] else count - 2
    if not np.isfinite(previous[state]):
        raise ValueError("No complete CTC alignment path")
    path = np.empty(len(emission), dtype=np.int64)
    for t in range(len(emission) - 1, -1, -1):
        path[t] = state
        state -= int(back[t, state])
    return [np.flatnonzero(path == 2 * i + 1) for i in range(len(tokens))]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("audio", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--backend", choices=("ctc", "whisper"), default="whisper")
    parser.add_argument("--whisper-model", default="medium")
    parser.add_argument("--ctc-fallback", type=Path)
    args = parser.parse_args()
    torch.set_num_threads(min(8, torch.get_num_threads()))
    waveform, sr = sf.read(args.audio, dtype="float32")
    if waveform.ndim == 2:
        waveform = waveform.mean(axis=1)
    if sr != 16000:
        divisor = math.gcd(sr, 16000)
        waveform = resample_poly(waveform, 16000 // divisor, sr // divisor)
        sr = 16000
    lrc_file = REPO / "lyrics" / "It's Alright.lrc"
    raw = lrc_file.read_text(encoding="utf-8-sig")
    source_rows = []
    for line in raw.splitlines():
        match = re.match(r"\[(\d+):(\d+(?:\.\d+)?)\](.*)", line)
        if match and match[3].strip():
            source_rows.append({"time": int(match[1]) * 60 + float(match[2]), "text": match[3].strip()})
    rows = []
    for index, row in enumerate(source_rows):
        if 8.9 <= row["time"] < 59:
            rows.append({**row, "end": source_rows[index + 1]["time"], "language": "ja" if re.search(r"[\u3040-\u9fff]", row["text"]) else "en"})
    result = {
        "format": "timed-lyrics-v1", "songId": "ItsAlright",
        "youtubeId": "HA3WzXw8vM8", "source": "Local CTC forced alignment experiment",
        "status": "experimental-unreviewed", "clip": {"start": 8.0, "end": 59.01},
        "audioSha256": hashlib.sha256(args.audio.read_bytes()).hexdigest(),
        "lrcSha256": hashlib.sha256(lrc_file.read_bytes()).hexdigest(),
        "method": "Known LRC text; per-line CTC Viterbi, Japanese and English models; original video clock in seconds.",
        "models": {}, "lines": [],
    }
    computed = {}
    fallback = json.loads(args.ctc_fallback.read_text(encoding="utf-8")) if args.ctc_fallback else None
    if fallback and (fallback["audioSha256"] != result["audioSha256"] or fallback["lrcSha256"] != result["lrcSha256"]):
        raise ValueError("CTC fallback must use the same audio and lyrics")
    if args.backend == "whisper":
        import stable_whisper
        import whisper
        print(f"Loading Whisper {args.whisper_model}", flush=True)
        model = stable_whisper.load_model(args.whisper_model, device="cpu", download_root=str(args.cache / "whisper"))
        result["source"] = "Local Whisper forced alignment experiment"
        result["method"] = "Demucs vocal stem; known LRC text; Whisper cross-attention/DTW within each non-overlapping LRC line window; original video clock in seconds."
        result["models"] = {"multilingual": {"id": f"openai/whisper-{args.whisper_model}", "sha256": whisper._MODELS[args.whisper_model].split("/")[-2]}}
        for language in MODELS:
            selected = [(i, row) for i, row in enumerate(rows) if row["language"] == language]
            segments = [{"start": row["time"], "end": row["end"], "text": row["text"]} for _, row in selected]
            aligned = model.align_words(waveform, segments, language=language, regroup=False, suppress_silence=True, min_word_dur=0.02, verbose=False)
            if len(aligned.segments) != len(selected):
                raise ValueError("Alignment changed the source line count")
            for (index, row), segment in zip(selected, aligned.segments):
                words = [{"text": word.word.strip(), "start": round(word.start, 3), "end": round(word.end, 3), "score": round(float(word.probability), 4)} for word in segment.words if word.word.strip()]
                if any(word["end"] <= word["start"] for word in words):
                    if not fallback:
                        raise ValueError(f"Unresolved zero-duration word in line {index}; provide --ctc-fallback")
                    candidate = fallback["lines"][index]
                    if candidate["text"] != row["text"]:
                        raise ValueError("CTC fallback text mismatch")
                    computed[index] = {**candidate, "alignmentModel": MODELS[language], "fallbackReason": "Whisper produced zero-duration words"}
                    result["models"][f"ctc-{language}"] = fallback["models"][language]
                    print(f"Line {index}: using same-audio CTC fallback (Whisper zero-duration words)", flush=True)
                    continue
                computed[index] = {"text": row["text"], "language": language, "sourceStart": row["time"], "windowStart": row["time"], "windowEnd": row["end"], "start": words[0]["start"], "end": words[-1]["end"], "words": words}
                computed[index]["alignmentModel"] = f"openai/whisper-{args.whisper_model}"
                print(json.dumps({"line": index, "range": [computed[index]["start"], computed[index]["end"]], "units": len(words), "words": words}, ensure_ascii=True), flush=True)
        result["lines"] = [computed[i] for i in range(len(rows))]
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote {len(rows)} lines to {args.output}", flush=True)
        return
    for language, model_id in MODELS.items():
        print(f"Loading {language}: {model_id}", flush=True)
        processor = AutoProcessor.from_pretrained(model_id, cache_dir=args.cache)
        model = Wav2Vec2ForCTC.from_pretrained(model_id, cache_dir=args.cache).eval()
        vocab = processor.tokenizer.get_vocab()
        blank = model.config.pad_token_id
        result["models"][language] = {"id": model_id, "revision": model.config._commit_hash}
        for index, row in enumerate(rows):
            if row["language"] != language:
                continue
            begin = row["time"]
            finish = row["end"]
            audio = waveform[round(begin * sr):round(finish * sr)]
            inputs = processor(audio, sampling_rate=sr, return_tensors="pt")
            with torch.inference_mode():
                logits = model(**inputs).logits[0]
                emission = logits.log_softmax(-1).cpu().numpy()
            text = unicodedata.normalize("NFKC", row["text"])
            normalized = text.upper() if language == "en" else text
            chars = []
            positions = []
            for position, char in enumerate(normalized):
                if char.isspace():
                    char = "|"
                if char not in vocab:
                    if unicodedata.category(char).startswith("P"):
                        continue
                    raise ValueError(f"Unsupported character {char!r} in {row['text']}")
                chars.append(char)
                positions.append(position)
            tokens = [vocab[char] for char in chars]
            frames = ctc_path(emission, tokens, blank)
            # The convolution starts every 320 samples with a 400-sample
            # receptive field; use its center, not a stretched frame clock.
            stride = int(np.prod(model.config.conv_stride)) / sr
            receptive = 1
            jump = 1
            for kernel, step in zip(model.config.conv_kernel, model.config.conv_stride):
                receptive += (kernel - 1) * jump
                jump *= step
            center = receptive / sr / 2
            char_times = {}
            for position, token, hit in zip(positions, tokens, frames):
                if not len(hit):
                    raise ValueError("CTC token received no frames")
                char_times[position] = {
                    "start": begin + hit[0] * stride + center - stride / 2,
                    "end": min(finish, begin + hit[-1] * stride + center + stride / 2),
                    "score": float(np.exp(emission[hit, token]).mean()),
                }
            groups = list(re.finditer(r"[A-Za-z]+(?:['’][A-Za-z]+)?", text)) if language == "en" else list(re.finditer(r"\S", text))
            words = []
            for group in groups:
                entries = [char_times[p] for p in range(group.start(), group.end()) if p in char_times]
                if not entries:
                    raise ValueError(f"No timing for {group.group()}")
                words.append({
                    "text": group.group(), "start": round(min(v["start"] for v in entries), 3),
                    "end": round(max(v["end"] for v in entries), 3),
                    "score": round(float(np.mean([v["score"] for v in entries])), 4),
                })
            computed[index] = {
                "text": row["text"], "language": language, "sourceStart": row["time"],
                "windowStart": round(begin, 3), "windowEnd": finish,
                "start": words[0]["start"], "end": words[-1]["end"], "words": words,
                "greedyText": processor.batch_decode(logits.argmax(-1).unsqueeze(0))[0],
            }
            print(json.dumps({"line": index, "language": language, "range": [computed[index]["start"], computed[index]["end"]], "units": len(words), "meanScore": round(float(np.mean([w['score'] for w in words])), 3), "greedy": computed[index]["greedyText"]}, ensure_ascii=True), flush=True)
        del model, processor
    result["lines"] = [computed[i] for i in range(len(rows))]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(rows)} lines to {args.output}", flush=True)


if __name__ == "__main__":
    main()
