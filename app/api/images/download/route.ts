import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    // Get the current session
    const session = await auth();

    // Get the image ID from the request
    const { imageId } = await req.json();

    if (!imageId) {
      return NextResponse.json({ error: "Image ID is required" }, { status: 400 });
    }

    // Get the image to verify it exists and is approved
    const image = await db.contributorItem.findUnique({
      where: {
        id: imageId,
        status: "APPROVED"
      }
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found or not approved" }, { status: 404 });
    }

    // Increment the download count
    await db.contributorItem.update({
      where: { id: imageId },
      data: {
        downloads: { increment: 1 }
      }
    });

    // Record download in a separate transaction if user is logged in
    if (session?.user) {
      // Check if the user has already downloaded this image
      const existingDownload = await db.download.findFirst({
        where: {
          userId: session.user.id,
          contributorItemId: imageId
        }
      });

      // If not already downloaded, create a new download record
      if (!existingDownload) {
        await db.download.create({
          data: {
            userId: session.user.id || '',
            contributorItemId: imageId
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Download recorded successfully"
    });
  } catch (error) {
    console.error("Download tracking error:", error);
    return NextResponse.json({ error: "Failed to record download" }, { status: 500 });
  }
} 