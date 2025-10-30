import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Generate a short MP4 animation from a single image using FFmpeg.
 * Falls back to a provided mock video if ffmpeg is not available.
 *
 * @param inputPath Local path to the input image (jpg/png)
 * @param outDir Directory where the output file will be written
 * @param durationSeconds Duration of the output video in seconds (default 4)
 * @returns Local path to generated mp4
 */
export async function generatePfpAnimation(inputPath: string, outDir = './.tmp', durationSeconds = 4): Promise<string> {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, `pfp-anim-${Date.now()}.mp4`);

  // Check ffmpeg availability
  const ffmpegAvailable = await isFfmpegAvailable();

  if (!ffmpegAvailable) {
    // Fall back to a mock placeholder if present in public
    const fallback = path.resolve('./public/mock-video.mp4');
    if (fs.existsSync(fallback)) {
      fs.copyFileSync(fallback, outFile);
      return outFile;
    }
    throw new Error('ffmpeg not available and no fallback mock-video.mp4 found');
  }

  // Build a simple zoompan command: loop image, apply zoom over frames, encode
  // We'll target 25 fps
  const fps = 25;
  const frames = durationSeconds * fps;

  // zoompan expression: start at 1.0 and slowly zoom to 1.25
  const zoomExpr = `zoom+0.002`; // incremental zoom per frame

  // ffmpeg command using zoompan
  // -loop 1 -i input -filter_complex "zoompan=z='zoom+0.002':d=${frames}:s=512x512,format=yuv420p" -c:v libx264 -t ${durationSeconds} -r ${fps} out.mp4

  const args = [
    '-y',
    '-loop', '1',
    '-i', inputPath,
    '-filter_complex', `zoompan=z='zoom+0.002':d=${frames}:s=512x512,format=yuv420p`,
    '-c:v', 'libx264',
    '-t', String(durationSeconds),
    '-r', String(fps),
    '-pix_fmt', 'yuv420p',
    outFile,
  ];

  await runCommand('ffmpeg', args);

  return outFile;
}

function runCommand(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: 'inherit' });
    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

function isFfmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-version']);
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}
