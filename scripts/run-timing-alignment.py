"""Produce provisional CTC word timings, using the existing local Fujii toolchain.

Audio/model weights stay outside this repository. Never writes manual reviews.
Run with that toolchain's Python and pass --tools for its align.py and models.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import unicodedata

import imageio_ffmpeg

sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
parser = argparse.ArgumentParser()
parser.add_argument("--tools", type=Path, required=True)
parser.add_argument("--work", type=Path, required=True)
parser.add_argument("--songs", nargs="*")
parser.add_argument("--backend", choices=["ctc", "whisper"], default="ctc")
args = parser.parse_args()
repo = Path(__file__).resolve().parents[1]
jobs_file = args.work / "jobs.json"
jobs = json.loads(jobs_file.read_text(encoding="utf-8"))["songs"]
output = repo / "lyrics" / "timing-candidates"
output.mkdir(exist_ok=True)
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
sha = lambda file: hashlib.sha256(file.read_bytes()).hexdigest()

def normal(text):
    return "".join(char for char in unicodedata.normalize("NFKC", text) if not char.isspace() and not unicodedata.category(char).startswith("P"))

def grouped_words(words, units):
    if normal("".join(word["text"] for word in words)) != normal("".join(unit["text"] for unit in units)):
        return [{**word, "reading": word["text"]} for word in words]
    ranges, cursor = [], 0
    for word in words:
        finish = cursor + len(normal(word["text"]))
        ranges.append((cursor, finish, word))
        cursor = finish
    grouped, cursor = [], 0
    for unit in units:
        finish = cursor + len(normal(unit["text"]))
        hits = [word for start, end, word in ranges if start >= cursor and end <= finish and end > cursor]
        if not hits or sum(len(normal(word["text"])) for word in hits) != finish - cursor:
            return [{**word, "reading": word["text"]} for word in words]
        grouped.append({"text": unit["text"], "reading": unit["reading"], "start": round(min(word["start"] for word in hits), 3),
                        "end": round(max(word["end"] for word in hits), 3), "score": round(sum(word.get("score", 0) for word in hits) / len(hits), 4)})
        cursor = finish
    return grouped

report_file = repo / "artifacts" / "timing-review" / "audio-alignment.json"
report = {"format": "yonezu-audio-alignment-report-v1", "method": "CTC known-text alignment on original mix; no vocal separation", "songs": []}
if report_file.exists():
    report = json.loads(report_file.read_text(encoding="utf-8"))
for job in jobs:
    if args.songs and job["songId"] not in args.songs:
        continue
    song_id = job["songId"]
    work = args.work / song_id
    work.mkdir(exist_ok=True)
    print(f"START {song_id}", flush=True)
    try:
        if sha(Path(job["lrcFile"])) != job["lrcSha256"]:
            raise ValueError("Supplied lyric source changed")
        target = output / f"{song_id}.json"
        if target.exists():
            saved = json.loads(target.read_text(encoding="utf-8"))
            saved_backend = saved.get("backend", "ctc")
            reusable_backend = saved_backend == args.backend or (args.backend == "ctc" and saved_backend == "whisper")
            if saved["sourceFingerprint"] == job["sourceFingerprint"] and reusable_backend and len(saved["lines"]) == job["lineCount"]:
                print(f"REUSE {song_id}", flush=True)
                continue
        source = work / "source.webm"
        origin_file = work / "source-origin.json"
        if not source.exists():
            existing = Path(job["existingAudio"]) if job.get("existingAudio") else None
            if existing and existing.exists():
                evidence = json.loads((existing.parent / "waveform-comparison.json").read_text(encoding="utf-8"))
                if evidence["videoId"] != job["youtubeId"]:
                    raise ValueError("Cached audio video ID mismatch")
                shutil.copy2(existing, source)
                origin = {"youtubeId": job["youtubeId"], "basis": "existing local waveform comparison", "audioSha256": sha(source)}
            else:
                subprocess.run([sys.executable, "-m", "yt_dlp", "--no-playlist", "--no-warnings", "--no-progress", "--write-info-json",
                                "--format", "bestaudio[ext=webm]", "--output", str(work / "source.%(ext)s"),
                                f"https://www.youtube.com/watch?v={job['youtubeId']}"], check=True)
                metadata = json.loads((work / "source.info.json").read_text(encoding="utf-8"))
                if metadata["id"] != job["youtubeId"]:
                    raise ValueError("Downloaded audio video ID mismatch")
                origin = {"youtubeId": metadata["id"], "title": metadata.get("title"), "channelId": metadata.get("channel_id"),
                          "channel": metadata.get("channel"), "duration": metadata.get("duration"), "basis": "downloaded specified video", "audioSha256": sha(source)}
            origin_file.write_text(json.dumps(origin, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        origin = json.loads(origin_file.read_text(encoding="utf-8"))
        if origin["youtubeId"] != job["youtubeId"] or origin["audioSha256"] != sha(source):
            raise ValueError("Audio identity changed")
        mix = work / "mix.wav"
        if not mix.exists():
            subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(source), "-ac", "1", "-ar", "16000", str(mix)], check=True)
        receipt = {"audioSha256": sha(source), "alignmentAudioSha256": sha(mix), "model": "original-mix-no-separation", "start": 0}
        (work / "separation.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
        raw = work / f"{args.backend}.json"
        command = [sys.executable, str(args.tools / "align.py"), song_id, str(mix), str(raw), "--jobs", str(jobs_file),
                   "--cache", str(args.tools / "models"), "--backend", args.backend]
        if args.backend == "whisper" and (work / "ctc.json").exists():
            command += ["--ctc-fallback", str(work / "ctc.json")]
        with (work / f"{args.backend}-alignment.log").open("w", encoding="utf-8") as log:
            subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, check=True)
        result = json.loads(raw.read_text(encoding="utf-8"))
        lines = []
        for original, candidate in zip(job["lines"], result["lines"]):
            if original["index"] != candidate["index"] or original["text"] != candidate["text"]:
                raise ValueError("Candidate row identity mismatch")
            words = grouped_words(candidate["words"], original["ctcUnits"])
            flags = list(candidate.get("flags", []))
            usable = bool(words) and not any(flag in flags for flag in ["no-timing", "zero-duration", "incomplete-text", "order-or-window-conflict"])
            usable = usable and normal("".join(word["text"] for word in words)) == normal(original["text"])
            mean_score = sum(word.get("score", 0) for word in words) / max(1, len(words))
            if mean_score < .15:
                flags.append("low-average-model-score")
                usable = False
            lines.append({"index": original["index"], "text": original["text"], "start": round(candidate.get("start", original["baselineStart"]), 3),
                          "end": round(candidate["end"], 3) if candidate.get("end") is not None else original["baselineEnd"],
                          "words": words, "flags": sorted(set(flags)), "usable": usable, "meanScore": round(mean_score, 4), "status": "unreviewed"})
        artifact = {"format": "yonezu-audio-timing-candidate-v1", "songId": song_id, "youtubeId": job["youtubeId"],
                    "sourceFingerprint": job["sourceFingerprint"], "sourceSha256": job["lrcSha256"], "audioSha256": result["audioSha256"],
                    "alignmentAudioSha256": result["alignmentAudioSha256"], "duration": result["duration"], "models": result["models"],
                    "backend": args.backend, "method": f"{args.backend} known-text alignment on original mix; no vocal separation", "helperScriptSha256": result["processing"]["scriptSha256"],
                    "versions": result["versions"], "source": origin, "status": "unreviewed", "lines": lines}
        temporary = target.with_suffix(".tmp")
        temporary.write_text(json.dumps(artifact, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(target)
        subprocess.run(["node", str(repo / "scripts" / "screen-timing-candidates.mjs"), "--songs", song_id], cwd=repo, check=True)
        artifact = json.loads(target.read_text(encoding="utf-8"))
        lines = artifact["lines"]
        summary = {"songId": song_id, "youtubeId": job["youtubeId"], "state": "candidate-ready", "lines": len(lines),
                   "usableLines": sum(line["usable"] for line in lines), "words": sum(len(line["words"]) for line in lines),
                   "candidateFile": f"lyrics/timing-candidates/{song_id}.json", "duration": result["duration"]}
        print(f"DONE {song_id}: {summary['usableLines']}/{len(lines)} usable lines, {summary['words']} units (unreviewed)", flush=True)
    except Exception as error:
        summary = {"songId": song_id, "youtubeId": job["youtubeId"], "state": "failed", "error": str(error)}
        print(f"FAILED {song_id}: {error}", flush=True)
    if report_file.exists():
        report = json.loads(report_file.read_text(encoding="utf-8"))
    report["songs"] = [row for row in report["songs"] if row["songId"] != song_id] + [summary]
    report["updatedAt"] = datetime.now(timezone.utc).isoformat()
    report_file.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
