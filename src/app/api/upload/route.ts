import { NextRequest, NextResponse } from 'next/server';
import { uploadBlob } from '~/lib/vercel-blob';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as unknown as File | null;

    if (!file || typeof (file as any).arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await (file as any).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = `upload-${Date.now()}-${(file as any).name || 'file'}`;

    const url = await uploadBlob(filename, buffer);

    return NextResponse.json({ success: true, url });
  } catch (err: any) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
