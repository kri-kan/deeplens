#!/usr/bin/env python3
"""
DeepLens Video Transcoding & Compression Pipeline
ADO User Story #290 (Tasks #291, #292, #293)

Transcodes catalog and staging videos using FFmpeg H.264 (CRF 24, +faststart)
to reclaim storage and ensure smooth mobile playback.
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
        endpoint_url=os.environ.get('MINIO_ENDPOINT', 'http://localhost:9000'),
        aws_access_key_id=os.environ.get('MINIO_ACCESS_KEY', 'krikan'),
        aws_secret_access_key=os.environ.get('MINIO_SECRET_KEY', 'Krikank1$'),
        config=Config(signature_version='s3v4', max_pool_connections=64),
        region_name='us-east-1'
    )

def run_psql(query):
    """Runs a query via psql CLI."""
    env = os.environ.copy()
    env['PGPASSWORD'] = 'Krikank1$'
    cmd = [
        'psql', '-h', '127.0.0.1', '-p', '5432', '-U', 'postgres', '-d', 'deeplens_platform',
        '-t', '-A', '-F', '\t', '-c', query
    ]
    res = subprocess.run(cmd, env=env, capture_output=True, text=True)
    if res.returncode != 0:
        return []
    lines = [l.strip() for l in res.stdout.strip().split('\n') if l.strip()]
    return [l.split('\t') for l in lines]

def transcode_video_file(in_path, out_path, crf=24, maxrate='2.5M', bufsize='5M'):
    """Transcodes a video file using FFmpeg with H.264 + AAC + faststart."""
    cmd = [
        FFMPEG_BIN, '-y', '-i', in_path,
        '-c:v', 'libx264', '-preset', 'medium', '-crf', str(crf),
        '-maxrate', maxrate, '-bufsize', bufsize,
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart',
        out_path
    ]
    res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
    return res.returncode == 0, res.stderr

def collect_candidate_videos(s3, buckets, min_age_days):
    """Collects candidate videos older than min_age_days across specified buckets."""
    candidates = []
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=min_age_days)
    cutoff_str = cutoff.strftime('%Y-%m-%d %H:%M:%S+00')
    
    print(f"[*] Querying candidate videos older than {min_age_days} days (Cutoff: {cutoff_str})...", flush=True)

    # 1. Query WhatsApp business dates from PostgreSQL
    q_wa = f"""
        SELECT 
            split_part(media_url, '/', 4) || '/' || split_part(media_url, '/', 5) as general_key,
            created_at
        FROM wa.messages
        WHERE media_url LIKE 'minio://general/%'
          AND created_at < '{cutoff_str}'
          AND (media_type = 'video' OR (media_type = 'document' AND media_url ILIKE ANY(ARRAY['%.mp4', '%.mov', '%.mkv', '%.3gp'])));
    """
    wa_rows = run_psql(q_wa)
    general_msg_dates = {r[0]: r[1] for r in wa_rows if len(r) >= 2 and r[0]}

    # 2. Query public.media uploaded_at dates
    q_media = f"""
        SELECT storage_path, uploaded_at, id
        FROM public.media
        WHERE media_type = 2 AND uploaded_at < '{cutoff_str}';
    """
    media_rows = run_psql(q_media)
    media_dates = {}
    media_ids = {}
    for r in media_rows:
        if len(r) >= 3 and r[0]:
            media_dates[r[0]] = r[1]
            media_ids[r[0]] = r[2]

    # 3. Scan MinIO buckets for objects
    for bucket in buckets:
        paginator = s3.get_paginator('list_objects_v2')
        b_count = 0
        for page in paginator.paginate(Bucket=bucket):
            for obj in page.get('Contents', []):
                key = obj['Key']
                if not any(key.lower().endswith(ext) for ext in VIDEO_EXTENSIONS):
                    continue
                
                size = obj['Size']
                last_mod = obj['LastModified']
                
                is_eligible = False
                matched_date = None
                
                if bucket == 'general':
                    if key in general_msg_dates:
                        is_eligible = True
                        matched_date = general_msg_dates[key]
                    elif f"general/{key}" in media_dates:
                        is_eligible = True
                        matched_date = media_dates[f"general/{key}"]
                    elif last_mod < cutoff:
                        is_eligible = True
                        matched_date = last_mod
                elif bucket == 'product':
                    if f"product/{key}" in media_dates:
                        is_eligible = True
                        matched_date = media_dates[f"product/{key}"]
                    elif last_mod < cutoff:
                        is_eligible = True
                        matched_date = last_mod
                elif bucket == 'instagram':
                    if f"instagram/{key}" in media_dates:
                        is_eligible = True
                        matched_date = media_dates[f"instagram/{key}"]
                    elif last_mod < cutoff:
                        is_eligible = True
                        matched_date = last_mod
                else:
                    if last_mod < cutoff:
                        is_eligible = True
                        matched_date = last_mod
                
                if is_eligible:
                    candidates.append({
                        'bucket': bucket,
                        'key': key,
                        'size': size,
                        'date': matched_date,
                        'media_id': media_ids.get(f"{bucket}/{key}")
                    })
                    b_count += 1
        print(f"  • Bucket '{bucket}': Found {b_count:,} candidate videos", flush=True)

    return candidates

def process_single_video(item, s3, crf, dry_run):
    """Processes a single video candidate: download, transcode, verify, and upload."""
    bucket = item['bucket']
    key = item['key']
    orig_size = item['size']
    
    if dry_run:
        return {
            'status': 'dry_run',
            'bucket': bucket,
            'key': key,
            'orig_size': orig_size,
            'new_size': int(orig_size * 0.15),  # ~85% reduction based on benchmark
            'saved': int(orig_size * 0.85)
        }

    with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as in_f, \
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
                'media_id': item.get('media_id')
            }
        else:
            return {
                'status': 'skipped_larger',
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
    parser = argparse.ArgumentParser(description="DeepLens Video Transcoding Pipeline")
    parser.add_argument('--min-age-days', type=int, default=100, help='Minimum age in days of candidate videos (default: 100)')
    parser.add_argument('--buckets', type=str, default='general,product,instagram', help='Comma-separated buckets to scan')
    parser.add_argument('--crf', type=int, default=24, help='H.264 CRF quality level (18-28, default: 24)')
    parser.add_argument('--workers', type=int, default=4, help='Parallel worker threads (default: 4)')
    parser.add_argument('--limit', type=int, default=0, help='Max videos to process (0 = all)')
    parser.add_argument('--dry-run', action='store_true', help='Preview candidates and estimated savings without modifying files')
    args = parser.parse_args()

    print("=" * 70)
    print(f"DeepLens Video Transcoder Pipeline")
    print(f"Min Age: {args.min_age_days} days | CRF: {args.crf} | Workers: {args.workers} | Dry-Run: {args.dry_run}")
    print("=" * 70)

    s3 = get_s3_client()
    buckets = [b.strip() for b in args.buckets.split(',') if b.strip()]

    candidates = collect_candidate_videos(s3, buckets, args.min_age_days)
    if args.limit > 0 and len(candidates) > args.limit:
        print(f"[*] Limiting candidates to {args.limit} of {len(candidates)}")
        candidates = candidates[:args.limit]

    total_candidates = len(candidates)
    if total_candidates == 0:
        print(f"[!] No candidate videos found older than {args.min_age_days} days.")
        return

    total_orig_bytes = sum(c['size'] for c in candidates)
    print(f"[*] Total Candidates: {total_candidates:,} videos ({total_orig_bytes / (1024**3):.2f} GB)")

    t0 = time.time()
    processed = 0
    total_saved_bytes = 0
    compressed_count = 0
    updated_media_ids = []

    print(f"\n[*] Starting batch transcoding with {args.workers} workers...", flush=True)

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
                    updated_media_ids.append((res['media_id'], res['new_size']))
            
            if processed % 10 == 0 or processed == total_candidates:
                pct = processed / total_candidates * 100
                saved_gb = total_saved_bytes / (1024**3)
                elapsed = time.time() - t0
                rate = processed / elapsed if elapsed > 0 else 0
                print(f"  [{processed:,}/{total_candidates:,} ({pct:.1f}%)] "
                      f"Compressed: {compressed_count:,} | Saved: {saved_gb:.2f} GB | Speed: {rate:.1f} v/s", flush=True)

    # Update PostgreSQL media table with updated file sizes
    if updated_media_ids and not args.dry_run:
        print(f"\n[*] Updating {len(updated_media_ids)} records in public.media...", flush=True)
        for mid, nsz in updated_media_ids:
            run_psql(f"UPDATE public.media SET file_size_bytes = {nsz} WHERE id = '{mid}';")

    elapsed_tot = time.time() - t0

    print("\n" + "=" * 70)
    print(f"TRANSCODING COMPLETE ({elapsed_tot:.1f}s)")
    print(f"  • Processed:         {processed:,} videos")
    print(f"  • Compressed:        {compressed_count:,} videos")
    print(f"  • Storage Saved:     {total_saved_bytes / (1024**3):.2f} GB "
          f"({total_saved_bytes / total_orig_bytes * 100 if total_orig_bytes else 0:.1f}% reduction)")
    print("=" * 70)

if __name__ == '__main__':
    main()
