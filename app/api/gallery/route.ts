import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { galleryImageSchema } from '@/lib/validation';
import { listGalleryImages, createGalleryImage } from '@/lib/services/galleryService';
import { apiErrorResponse } from '@/lib/apiErrors';

export async function GET() {
  try {
    const images = await listGalleryImages();
    return NextResponse.json(images);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = galleryImageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const image = await createGalleryImage(parsed.data);
    return NextResponse.json(image, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
