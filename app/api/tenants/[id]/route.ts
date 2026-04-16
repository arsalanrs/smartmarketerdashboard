import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
    }

    await prisma.tenant.delete({
      where: { id },
    })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const e = error as { code?: string }
    if (e.code === 'P2025') {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    console.error('Error deleting tenant:', error)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to delete client' },
      { status: 500 }
    )
  }
}
