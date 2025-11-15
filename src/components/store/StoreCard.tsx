import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StoreCardProps {
  store: {
    id: string;
    name: string;
    city: string;
    district?: string;
    phone: string;
    primary_image?: string;
    is_active: boolean;
  };
  onViewDetails: () => void;
}

const StoreCard = ({ store, onViewDetails }: StoreCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 group">
      <div className="relative h-48 bg-muted overflow-hidden">
        {store.primary_image ? (
          <img
            src={store.primary_image}
            alt={store.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <MapPin className="h-16 w-16 text-primary/40" />
          </div>
        )}
        {!store.is_active && (
          <Badge variant="destructive" className="absolute top-2 right-2">
            Inactive
          </Badge>
        )}
      </div>
      <CardContent className="p-6">
        <h3 className="text-xl font-bold mb-2 text-foreground">{store.name}</h3>
        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              {store.city}
              {store.district && `, ${store.district}`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 flex-shrink-0" />
            <a href={`tel:${store.phone}`} className="hover:text-primary transition-colors">
              {store.phone}
            </a>
          </div>
        </div>
        <Button onClick={onViewDetails} className="w-full">
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </Button>
      </CardContent>
    </Card>
  );
};

export default StoreCard;
