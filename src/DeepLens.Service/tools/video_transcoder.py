#!/usr/bin/env python3
"""
DeepLens Video Transcoding & Compression Pipeline
ADO User Story #898 (Tasks #899, #900, #901, #902)

Transcodes catalog and WhatsApp staging videos using FFmpeg H.264 (CRF 22, +faststart, 1080p max)
to reclaim storage in-place while ensuring pristine visual quality for Instagram Reels and instant mobile playback.
"""

import argparse
import os
import sys
import time
import tempfile
import subprocess
import boto3
from botocore.client import Config
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

FFMPEG_BIN = os.environ.get("FFMPEG_BIN", "/home/krikan/.local/bin/ffmpeg")
VIDEO_EXTENSIONS = ('.mp4', '.mov', '.avi', '.mkv', '.webm', '.3gp', '.m4v')

def get_s3_client():
    return boto3.client(
        's3',
        endpoint_url=os.environ.get('MINIO_ENDPOINT', 'http://127.0.0.1:9000'),
        aws_access_key_id=os.environ.get('MINIO_ACCESS_KEY', 'krikan'),
        aws_secret_access_key=os.environ.get('MINIO_SECRET_KEY', 'Krikank1$'),
        config=Config(signature_version='s3v4', max_pool_connections=64),
        region_name='us-east-1'
    )

def run_psql(query):
    """Runs a query via psql CLI."""
    env = os.environ.copy()
    env['PGPASSWORD'] = os.environ.get('PG_PASSWORD', 'Krikank1$')
    cmd = [
        'psql', '-h', os.environ.get('PG_HOST', '192.168.0.170'),
        '-p', os.environ.get('PG_PORT', '5432'),
        '-U', os.environ.get('PG_USER', 'postgres'),
        '-d', os.environ.get('PG_DB', 'deeplens_platform'),
        '-t', '-A', '-F', '\t', '-c', query
    ]
    res = subprocess.run(cmd, env=env, capture_output=True, text=True)
    if res.returncode != 0:
        return []
    lines = [l.strip() for l in res.stdout.strip().split('\n') if l.strip()]
    return [l.split('\t') for l in lines]

def transcode_video_file(in_path, out_path, crf=22, maxrate='6.5M', bufsize='10M'):
    """
    Transcodes a video file using FFmpeg with Instagram-optimized profile:
    H.264 (CRF 22), 1080p max resolution (scale=min(1080,iw):-2), AAC 128k audio, +faststart.
    """
    cmd = [
        FFMPEG_BIN, '-y', '-i', in_path,
        '-c:v', 'libx264', '-preset', 'fast', '-crf', str(crf),
        '-maxrate', maxrate, '-bufsize', bufsize,
        '-vf', 'scale=min(1080\\,iw):-2',
        '-c:a', 'aac', '-b:a', '128k', '-ar', '48000',
        '-movflags', '+faststart',
        out_path
    ]
    res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
    return res.returncode == 0, res.stderr

def collect_candidate_videos(s3, buckets, min_age_days=0, min_size_mb=5):
    """Collects candidate videos across specified buckets matching age and minimum size."""
    candidates = []
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=min_age_days) if min_age_days > 0 else None
    min_size_bytes = min_size_mb * 1024 * 1024

    print(f"[*] Scanning buckets: {', '.join(buckets)} (Min Size: {min_size_mb} MB, Min Age: {min_age_days} days)...", flush=True)

    # Pre-fetch media IDs from public.media
    q_media = "SELECT storage_path, id FROM public.media WHERE media_type = 2 OR storage_path ILIKE '%.mov' OR storage_path ILIKE '%.mp4';"
    media_rows = run_psql(q_media)
    media_map = {}
    for r in media_rows:
        if len(r) >= 2 and r[0]:
            media_map[r[0]] = r[1]

    for bucket in buckets:
        paginator = s3.get_paginator('list_objects_v2')
        b_count = 0
        b_bytes = 0
        for page in paginator.paginate(Bucket=bucket):
            for obj in page.get('Contents', []):
                key = obj['Key']
                if not any(key.lower().endswith(ext) for ext in VIDEO_EXTENSIONS):
                    continue

                size = obj['Size']
                if size < min_size_bytes:
                    continue

                last_mod = obj['LastModified']
                if cutoff and last_mod > cutoff:
                    continue

                # Matched candidate
                media_path = f"{bucket}/{key}"
                media_id = media_map.get(media_path) or media_map.get(key)
                minio_url = f"minio://{bucket}/{key}"

                candidates.append({
                    'bucket': bucket,
                    'key': key,
                    'size': size,
                    'last_modified': last_mod,
                    'media_id': media_id,
                    'minio_url': minio_url
                })
                b_count += 1
                b_bytes += size

        print(f"  • Bucket '{bucket}': Found {b_count:,} candidate videos ({b_bytes / (1024**3):.2f} GB)", flush=True)

    return candidates

def process_single_video(item, s3, crf, dry_run):
    """Processes a single video candidate: download, transcode, verify, and upload in-place."""
    bucket = item['bucket']
    key = item['key']
    orig_size = item['size']

    if dry_run:
        est_new_size = int(orig_size * 0.35)  # ~65% reduction on average
        return {
            'status': 'dry_run',
            'bucket': bucket,
            'key': key,
            'orig_size': orig_size,
            'new_size': est_new_size,
            'saved': orig_size - est_new_size,
            'media_id': item.get('media_id'),
            'minio_url': item.get('minio_url')
        }

    with tempfile.NamedTemporaryFile(suffix='.tmp', delete=False) as in_f, \
         tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as out_f:
        in_path = in_f.name
        out_path = out_f.name

    try:
        # 1. Download
        s3.download_file(bucket, key, in_path)

        # 2. Transcode
        success, stderr = transcode_video_file(in_path, out_path, crf=crf)
        if not success or not os.path.exists(out_path):
            return {'status': 'error', 'bucket': bucket, 'key': key, 'error': stderr[-300:] if stderr else 'ffmpeg error'}

        new_size = os.path.getsize(out_path)

        # 3. Check if compression actually saved space
        if new_size < orig_size and new_size > 1024:
            s3.upload_file(
                out_path, bucket, key,
                ExtraArgs={'ContentType': 'video/mp4'}
            )
            saved = orig_size - new_size
            return {
                'status': 'compressed',
                'bucket': bucket,
                'key': key,
                'orig_size': orig_size,
                'new_size': new_size,
                'saved': saved,
                'media_id': item.get('media_id'),
                'minio_url': item.get('minio_url')
            }
        else:
            return {
                'status': 'skipped_already_optimized',
                'bucket': bucket,
                'key': key,
                'orig_size': orig_size,
                'new_size': new_size,
                'saved': 0
            }
    except Exception as ex:
        return {'status': 'exception', 'bucket': bucket, 'key': key, 'error': str(ex)}
    finally:
        if os.path.exists(in_path): os.remove(in_path)
        if os.path.exists(out_path): os.remove(out_path)

def main():
    parser = argparse.ArgumentParser(description="DeepLens In-Place Video Transcoding & Compression Pipeline")
    parser.add_argument('--min-age-days', type=int, default=0, help='Minimum age in days of candidate videos (default: 0 = all)')
    parser.add_argument('--min-size-mb', type=int, default=5, help='Minimum file size in MB to compress (default: 5 MB)')
    parser.add_argument('--buckets', type=str, default='general,whatsapp-data,product', help='Comma-separated buckets to scan')
    parser.add_argument('--crf', type=int, default=22, help='H.264 CRF quality level (18=near-lossless, 22=Instagram sweet spot, default: 22)')
    parser.add_argument('--workers', type=int, default=4, help='Parallel worker threads (default: 4)')
    parser.add_argument('--limit', type=int, default=0, help='Max videos to process (0 = all)')
    parser.add_argument('--dry-run', action='store_true', help='Preview candidates and estimated savings without modifying files')
    args = parser.parse_args()

    print("=" * 75)
    print("DeepLens In-Place Video Transcoder Pipeline")
    print(f"Buckets: {args.buckets} | Min Size: {args.min_size_mb} MB | CRF: {args.crf} | Workers: {args.workers} | Dry-Run: {args.dry_run}")
    print("=" * 75)

    s3 = get_s3_client()
    buckets = [b.strip() for b in args.buckets.split(',') if b.strip()]

    candidates = collect_candidate_videos(s3, buckets, min_age_days=args.min_age_days, min_size_mb=args.min_size_mb)
    if args.limit > 0 and len(candidates) > args.limit:
        print(f"[*] Limiting candidates to {args.limit} of {len(candidates)}")
        candidates = candidates[:args.limit]

    total_candidates = len(candidates)
    if total_candidates == 0:
        print("[!] No candidate videos found matching criteria.")
        return

    total_orig_bytes = sum(c['size'] for c in candidates)
    print(f"\n[*] Total Candidates: {total_candidates:,} videos ({total_orig_bytes / (1024**3):.2f} GB)")

    t0 = time.time()
    processed = 0
    total_saved_bytes = 0
    compressed_count = 0
    updated_media = []
    updated_messages = []

    print(f"\n[*] Starting in-place transcoding with {args.workers} workers...", flush=True)

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(process_single_video, c, s3, args.crf, args.dry_run): c for c in candidates}

        for future in as_completed(futures):
            res = future.result()
            processed += 1
            status = res.get('status')

            if status in ('compressed', 'dry_run'):
                compressed_count += 1
                total_saved_bytes += res.get('saved', 0)
                if res.get('media_id'):
                    updated_media.append((res['media_id'], res['new_size']))
                if res.get('minio_url'):
                    updated_messages.append((res['minio_url'], res['new_size']))

            if processed % 10 == 0 or processed == total_candidates:
                pct = processed / total_candidates * 100
                saved_gb = total_saved_bytes / (1024**3)
                elapsed = time.time() - t0
                rate = processed / elapsed if elapsed > 0 else 0
                print(f"  [{processed:,}/{total_candidates:,} ({pct:.1f}%)] "
                      f"Compressed: {compressed_count:,} | Saved: {saved_gb:.2f} GB | Speed: {rate:.1f} v/s", flush=True)

    # Update PostgreSQL tables
    if not args.dry_run:
        if updated_media:
            print(f"\n[*] Updating {len(updated_media)} records in public.media...", flush=True)
            for mid, nsz in updated_media:
                run_psql(f"UPDATE public.media SET file_size_bytes = {nsz}, mime_type = 'video/mp4' WHERE id = '{mid}';")

        if updated_messages:
            print(f"[*] Updating {len(updated_messages)} records in wa.messages...", flush=True)
            for m_url, nsz in updated_messages:
                # Escape single quotes in URL
                clean_url = m_url.replace("'", "''")
                run_psql(f"UPDATE wa.messages SET media_size = {nsz}, media_mime_type = 'video/mp4' WHERE media_url = '{clean_url}';")

    elapsed_tot = time.time() - t0

    print("\n" + "=" * 75)
    print(f"TRANSCODING COMPLETE ({elapsed_tot:.1f}s)")
    print(f"  • Processed:         {processed:,} videos")
    print(f"  • Compressed:        {compressed_count:,} videos")
    print(f"  • Storage Saved:     {total_saved_bytes / (1024**3):.2f} GB "
          f"({total_saved_bytes / total_orig_bytes * 100 if total_orig_bytes else 0:.1f}% reduction)")
    print("=" * 75)

if __name__ == '__main__':
    main()
