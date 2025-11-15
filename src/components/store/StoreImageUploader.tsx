import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X, Upload, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import imageCompression from "browser-image-compression";

interface StoreImage {
  id?: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
  file?: File;
}

interface StoreImageUploaderProps {
  images: StoreImage[];
  onChange: (images: StoreImage[]) => void;
}

const StoreImageUploader = ({ images, onChange }: StoreImageUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    setUploading(true);
    const files = Array.from(e.target.files);
    const newImages: StoreImage[] = [];

    for (const file of files) {
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });

        const reader = new FileReader();
        const url = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(compressed);
        });

        newImages.push({
          image_url: url,
          is_primary: images.length === 0 && newImages.length === 0,
          display_order: images.length + newImages.length,
          file: compressed,
        });
      } catch (error) {
        console.error("Error compressing image:", error);
        toast({
          title: "Error",
          description: "Failed to process image",
          variant: "destructive",
        });
      }
    }

    onChange([...images, ...newImages]);
    setUploading(false);
  };

  const handleRemove = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    // If removed image was primary, make first image primary
    if (images[index].is_primary && updated.length > 0) {
      updated[0].is_primary = true;
    }
    onChange(updated);
  };

  const handleSetPrimary = (index: number) => {
    const updated = images.map((img, i) => ({
      ...img,
      is_primary: i === index,
    }));
    onChange(updated);
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const updated = [...images];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    onChange(updated.map((img, i) => ({ ...img, display_order: i })));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => document.getElementById("store-image-input")?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? "Uploading..." : "Upload Images"}
        </Button>
        <input
          id="store-image-input"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <span className="text-sm text-muted-foreground">
          {images.length} image(s) selected
        </span>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={image.image_url}
                alt={`Store ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border-2 border-border"
              />
              <div className="absolute top-2 right-2 flex gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-7 w-7"
                  onClick={() => handleRemove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-2 left-2">
                <Button
                  type="button"
                  size="sm"
                  variant={image.is_primary ? "default" : "secondary"}
                  className="h-7 text-xs"
                  onClick={() => handleSetPrimary(index)}
                >
                  <Star
                    className={`h-3 w-3 mr-1 ${
                      image.is_primary ? "fill-current" : ""
                    }`}
                  />
                  {image.is_primary ? "Primary" : "Set Primary"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StoreImageUploader;
