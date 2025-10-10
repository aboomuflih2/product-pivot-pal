import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
  isNew?: boolean;
}

const ProductCard = ({ id, name, price, image, category, isNew }: ProductCardProps) => {
  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all">
      <CardContent className="p-0">
        <Link to={`/product/${id}`} className="block">
          <div className="relative overflow-hidden aspect-square">
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
            <div className="absolute top-2 left-2 flex flex-col gap-2">
              <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
                {category}
              </Badge>
              {isNew && (
                <Badge className="bg-accent text-accent-foreground">
                  New
                </Badge>
              )}
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {name}
            </h3>
            <p className="text-primary font-bold text-xl">₹{price.toLocaleString()}</p>
          </div>
        </Link>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full" variant="outline">
          <Link to={`/product/${id}`}>View Options</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
