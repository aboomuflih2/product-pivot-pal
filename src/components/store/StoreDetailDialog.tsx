import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  ExternalLink,
  MessageCircle,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface StoreDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: {
    id: string;
    name: string;
    address_line_1: string;
    address_line_2?: string | null;
    city: string;
    state: string;
    district?: string;
    local_body_type?: string;
    local_body_name?: string;
    post_office?: string;
    landmark?: string;
    postal_code: string;
    country: string;
    phone: string;
    email?: string | null;
    whatsapp?: string;
    google_maps_url?: string;
    google_business_url?: string;
    facebook_url?: string;
    instagram_url?: string;
    twitter_url?: string;
    youtube_url?: string;
    opening_hours: Record<string, string>;
    images?: Array<{ image_url: string; is_primary: boolean }>;
  };
}

const StoreDetailDialog = ({ open, onOpenChange, store }: StoreDetailDialogProps) => {
  const formatOpeningHours = (hours: Record<string, string>) => {
    return Object.entries(hours).map(([day, time]) => ({
      day: day.charAt(0).toUpperCase() + day.slice(1),
      time,
    }));
  };

  const socialLinks = [
    { url: store.facebook_url, icon: Facebook, label: "Facebook", color: "text-blue-600" },
    { url: store.instagram_url, icon: Instagram, label: "Instagram", color: "text-pink-600" },
    { url: store.twitter_url, icon: Twitter, label: "Twitter", color: "text-sky-500" },
    { url: store.youtube_url, icon: Youtube, label: "YouTube", color: "text-red-600" },
  ].filter((link) => link.url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{store.name}</DialogTitle>
        </DialogHeader>

        {/* Image Gallery */}
        {store.images && store.images.length > 0 && (
          <div className="mb-6">
            <Carousel className="w-full">
              <CarouselContent>
                {store.images.map((image, index) => (
                  <CarouselItem key={index}>
                    <div className="relative h-64 md:h-96 bg-muted rounded-lg overflow-hidden">
                      <img
                        src={image.image_url}
                        alt={`${store.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {image.is_primary && (
                        <Badge className="absolute top-2 left-2">Primary Image</Badge>
                      )}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {store.images.length > 1 && (
                <>
                  <CarouselPrevious />
                  <CarouselNext />
                </>
              )}
            </Carousel>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Address Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Address
            </h3>
            <div className="text-sm space-y-1 text-muted-foreground">
              <p>{store.address_line_1}</p>
              {store.address_line_2 && <p>{store.address_line_2}</p>}
              {store.landmark && <p className="font-medium">Near: {store.landmark}</p>}
              {store.local_body_type && store.local_body_name && (
                <p>
                  {store.local_body_type}: {store.local_body_name}
                </p>
              )}
              {store.post_office && <p>Post Office: {store.post_office}</p>}
              <p>
                {store.city}, {store.district && `${store.district}, `}
                {store.state} - {store.postal_code}
              </p>
              <p>{store.country}</p>
            </div>

            {/* Google Maps */}
            {store.google_maps_url && (
              <div className="mt-4">
                <Button variant="outline" className="w-full" asChild>
                  <a href={store.google_maps_url} target="_blank" rel="noopener noreferrer">
                    <MapPin className="mr-2 h-4 w-4" />
                    Open in Google Maps
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            )}

            {/* Google Business */}
            {store.google_business_url && (
              <Button variant="outline" className="w-full" asChild>
                <a href={store.google_business_url} target="_blank" rel="noopener noreferrer">
                  View Google Business Profile
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
          </div>

          {/* Contact & Hours */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Contact
            </h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href={`tel:${store.phone}`}>
                  <Phone className="mr-2 h-4 w-4" />
                  {store.phone}
                </a>
              </Button>

              {store.whatsapp && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a
                    href={`https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    WhatsApp: {store.whatsapp}
                  </a>
                </Button>
              )}

              {store.email && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={`mailto:${store.email}`}>
                    <Mail className="mr-2 h-4 w-4" />
                    {store.email}
                  </a>
                </Button>
              )}
            </div>

            {/* Social Media */}
            {socialLinks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Follow Us</h4>
                <div className="flex flex-wrap gap-2">
                  {socialLinks.map((link, index) => {
                    const Icon = link.icon;
                    return (
                      <Button
                        key={index}
                        variant="outline"
                        size="icon"
                        asChild
                        className={link.color}
                      >
                        <a href={link.url!} target="_blank" rel="noopener noreferrer">
                          <Icon className="h-5 w-5" />
                        </a>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Operating Hours */}
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <Clock className="h-5 w-5 text-primary" />
                Operating Hours
              </h3>
              <div className="space-y-1 text-sm">
                {formatOpeningHours(store.opening_hours).map(({ day, time }) => (
                  <div key={day} className="flex justify-between py-1 border-b border-border/50">
                    <span className="font-medium">{day}</span>
                    <span className="text-muted-foreground">{time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StoreDetailDialog;
