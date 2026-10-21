import JSZip from 'jszip';

export interface ExtractedDocxImage {
  id: string;
  name: string;
  dataUrl: string;
  questionNumber?: number;
}

export interface DocxMediaResult {
  imagesByQuestionNumber: Record<number, string>;
  allImages: ExtractedDocxImage[];
  rIdToDataUrl?: Record<string, string>;
}

/**
 * Downscales and compresses large images client-side to prevent memory bloat
 * in large question banks while preserving high visual legibility.
 */
async function compressImageIfPossible(dataUrl: string, mime: string, maxDimension: number = 1000): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return dataUrl;
  }
  // Skip SVGs and non-raster formats
  if (mime === 'image/svg+xml') {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // If image is already modest in size, return as is
        if (width <= maxDimension && height <= maxDimension && dataUrl.length < 350000) {
          resolve(dataUrl);
          return;
        }

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to efficient webp or jpeg format
        const targetFormat = 'image/jpeg';
        const compressed = canvas.toDataURL(targetFormat, 0.85);
        // Only adopt if it actually reduced the size or resolution
        resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
      } catch (e) {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Non-destructive helper to extract embedded diagrams and pictures from an unpacked Word (.docx) JSZip archive.
 * Preserves the original document text extraction completely intact.
 */
export async function extractDocxMedia(zip: JSZip, documentXml?: string): Promise<DocxMediaResult> {
  const result: DocxMediaResult = {
    imagesByQuestionNumber: {},
    allImages: [],
  };

  try {
    // 1. Locate all media files in word/media/
    const mediaFiles = zip.file(/^word\/media\/.+/i);
    if (!mediaFiles || mediaFiles.length === 0) {
      return result;
    }

    // 2. Build map of media path -> base64 data URL
    const mediaDataUrls: Record<string, string> = {};
    for (const file of mediaFiles) {
      const filename = file.name.replace(/^word\//i, '');
      const lower = filename.toLowerCase();
      let mime = 'image/png';
      if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mime = 'image/jpeg';
      else if (lower.endsWith('.gif')) mime = 'image/gif';
      else if (lower.endsWith('.svg')) mime = 'image/svg+xml';
      else if (lower.endsWith('.webp')) mime = 'image/webp';
      else if (lower.endsWith('.bmp')) mime = 'image/bmp';

      try {
        const base64 = await file.async('base64');
        const rawDataUrl = `data:${mime};base64,${base64}`;
        // Compress and optimize memory footprint for question pools
        const dataUrl = await compressImageIfPossible(rawDataUrl, mime);
        mediaDataUrls[filename] = dataUrl;
        mediaDataUrls[file.name] = dataUrl;
        
        // Also map just the filename e.g. "image1.png"
        const baseName = filename.split('/').pop() || '';
        if (baseName) {
          mediaDataUrls[baseName] = dataUrl;
        }
      } catch (err) {
        console.warn('Failed to convert docx media file to base64:', file.name, err);
      }
    }

    // 3. Parse relationship file word/_rels/document.xml.rels to link rId -> media path
    const rIdToDataUrl: Record<string, string> = {};
    const relsFile = zip.file('word/_rels/document.xml.rels');
    if (relsFile) {
      try {
        const relsXml = await relsFile.async('string');
        const parser = new DOMParser();
        const relsDoc = parser.parseFromString(relsXml, 'text/xml');
        const relationships = relsDoc.getElementsByTagName('Relationship');
        for (let i = 0; i < relationships.length; i++) {
          const rel = relationships[i];
          const id = rel.getAttribute('Id') || '';
          const target = rel.getAttribute('Target') || '';
          const type = rel.getAttribute('Type') || '';

          if (type.includes('/image') || target.startsWith('media/') || target.startsWith('word/media/')) {
            const cleanTarget = target.replace(/^word\//, '');
            const targetBase = cleanTarget.split('/').pop() || '';
            const matchedUrl = mediaDataUrls[cleanTarget] || mediaDataUrls[target] || mediaDataUrls[targetBase];
            if (matchedUrl && id) {
              rIdToDataUrl[id] = matchedUrl;
            }
          }
        }
      } catch (relsErr) {
        console.warn('Failed to parse document.xml.rels for images:', relsErr);
      }
    }

    result.rIdToDataUrl = rIdToDataUrl;

    // 4. Parse document.xml to associate images with questions (supporting both paragraphs and table cells)
    if (documentXml) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(documentXml, 'text/xml');
        
        // Find all blocks: paragraphs and table cells
        const blocks = Array.from(doc.querySelectorAll('w\\:p, p, w\\:tc, tc'));

        let currentQuestionNum: number | null = null;
        let questionCounter = 0;

        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i];
          const textContent = block.textContent?.trim() || '';

          // Detect question markers e.g. "1.", "1)", "Question 1", "Q1:"
          const qMatch = textContent.match(/^(?:(?:SECTION|PART)\s*[^:\n]+[:\-\s]*)?(?:Question|Q|Problem|Item|Task|No\.?|Number)?\s*(\d+)[\.\:\)\s\-]/i);
          if (qMatch) {
            const parsedNum = parseInt(qMatch[1], 10);
            if (!isNaN(parsedNum) && parsedNum > 0 && parsedNum <= 5000) {
              currentQuestionNum = parsedNum;
              questionCounter++;
            }
          }

          // Search for drawing blip or v:imagedata in this block namespace-agnostically
          const foundRIds: string[] = [];
          const allDescendants = Array.from(block.querySelectorAll('*'));
          
          for (const el of allDescendants) {
            const localTag = (el.localName || el.nodeName.split(':').pop() || '').toLowerCase();
            if (localTag === 'blip') {
              const rEmbed = el.getAttribute('r:embed') || el.getAttribute('embed') || el.getAttribute('r:link') || el.getAttribute('link') || '';
              if (rEmbed) foundRIds.push(rEmbed);
            } else if (localTag === 'imagedata') {
              const rId = el.getAttribute('r:id') || el.getAttribute('id') || el.getAttribute('o:relid') || el.getAttribute('relid') || '';
              if (rId) foundRIds.push(rId);
            }
          }

          for (const rId of foundRIds) {
            const dataUrl = rIdToDataUrl[rId];
            if (dataUrl) {
              const qNum = currentQuestionNum ?? questionCounter;
              if (qNum && !result.imagesByQuestionNumber[qNum]) {
                result.imagesByQuestionNumber[qNum] = dataUrl;
              }
              const isAlreadyAdded = result.allImages.some(img => img.id === rId);
              if (!isAlreadyAdded) {
                result.allImages.push({
                  id: rId,
                  name: `Question ${qNum || 'Diagram'} Image`,
                  dataUrl,
                  questionNumber: qNum || undefined,
                });
              }
            }
          }
        }
      } catch (xmlErr) {
        console.warn('Failed to map document XML images to questions:', xmlErr);
      }
    }

    // 5. If some media files were not mapped via rId, add them to allImages
    Object.entries(mediaDataUrls).forEach(([filename, dataUrl], idx) => {
      const alreadyIncluded = result.allImages.some((img) => img.dataUrl === dataUrl);
      if (!alreadyIncluded) {
        result.allImages.push({
          id: `media_${idx + 1}`,
          name: filename,
          dataUrl,
        });
      }
    });
  } catch (err) {
    console.warn('Error during Word document media extraction:', err);
  }

  return result;
}
