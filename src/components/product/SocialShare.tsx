import { Facebook, Twitter, Share, Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

interface SocialShareProps {
  url: string;
  title: string;
  description: string;
  imageUrl?: string;
}

const SocialShare = ({ url, title, description, imageUrl }: SocialShareProps) => {
  const { toast } = useToast();

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);
  const encodedImage = imageUrl ? encodeURIComponent(imageUrl) : "";

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    pinterest: imageUrl
      ? `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedImage}&description=${encodedDescription}`
      : null,
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: "Product link has been copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShare = (platform: string, link: string | null) => {
    if (!link) return;
    window.open(link, "_blank", "noopener,noreferrer,width=600,height=600");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="lg" variant="outline">
          <Share className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm mb-3">Share this product</h4>
          
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => handleShare("facebook", shareLinks.facebook)}
          >
            <Facebook className="h-4 w-4 mr-2" />
            Share on Facebook
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => handleShare("twitter", shareLinks.twitter)}
          >
            <Twitter className="h-4 w-4 mr-2" />
            Share on Twitter
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => handleShare("whatsapp", shareLinks.whatsapp)}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Share on WhatsApp
          </Button>

          {shareLinks.pinterest && (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleShare("pinterest", shareLinks.pinterest)}
            >
              <Share className="h-4 w-4 mr-2" />
              Pin on Pinterest
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleCopyLink}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SocialShare;