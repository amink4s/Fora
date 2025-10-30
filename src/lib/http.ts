import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';

export function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        return reject(new Error(`Failed to download ${url}. Status ${res.statusCode}`));
      }

      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', (err) => {
        fs.unlink(dest, () => reject(err));
      });
    });

    req.on('error', (err) => reject(err));
  });
}
