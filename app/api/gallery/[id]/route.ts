import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { deleteGalleryImage } from '@/lib/services/galleryService';
import { apiErrorResponse } from '@/lib/apiErrors';

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const deleted = await deleteGalleryImage(params.id);
    if (!deleted) return NextResponse.json({ error: 'Gallery image not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Gallery image not found');
  }
}
