"use server";

/**
 * Fetches an image from a given URL on the server-side to bypass CORS issues,
 * and returns it as a Base64 encoded string.
 * @param url The URL of the image to fetch (e.g., a signed URL from storage).
 * @returns An object with the success status and the Base64 string or an error message.
 */
export async function getBase64FromUrl(url: string): Promise<{ success: boolean; base64?: string; error?: string }> {
    try {
        if (!url) {
            throw new Error("Image URL is required.");
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch image from storage. Status: ${response.status}`);
        }

        // Convert the image response to a Buffer, then to a Base64 string
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString("base64");

        return { success: true, base64 };
    } catch (error: any) {
        console.error("Error in getBase64FromUrl:", error);
        return { success: false, error: error.message || "An unknown error occurred while processing the image." };
    }
}