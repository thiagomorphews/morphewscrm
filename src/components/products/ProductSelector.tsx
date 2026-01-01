import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronDown, Star, Search, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/hooks/useProducts';

interface ProductSelectorProps {
  products: Product[];
  selectedProductId?: string;
  onSelect: (product: Product) => void;
  placeholder?: string;
  showDescriptionInButtons?: boolean;
  className?: string;
}

export function ProductSelector({
  products,
  selectedProductId,
  onSelect,
  placeholder = 'Buscar produto...',
  showDescriptionInButtons = true,
  className,
}: ProductSelectorProps) {
  const [open, setOpen] = useState(false);

  // Separate featured and non-featured products
  const { featuredProducts, allProducts } = useMemo(() => {
    const activeProducts = products.filter(p => p.is_active);
    const featured = activeProducts.filter(p => p.is_featured);
    return {
      featuredProducts: featured,
      allProducts: activeProducts,
    };
  }, [products]);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleSelect = (product: Product) => {
    onSelect(product);
    setOpen(false);
  };

  if (products.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Nenhum produto cadastrado. Cadastre produtos nas Configurações.
      </p>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Featured Products - Quick Action Buttons */}
      {featuredProducts.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            <Star className="w-4 h-4" />
            Produtos em Destaque
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {featuredProducts.map((product) => (
              <Button
                key={product.id}
                variant={selectedProductId === product.id ? 'default' : 'outline'}
                className="h-auto p-4 flex flex-col items-start text-left"
                onClick={() => handleSelect(product)}
              >
                <span className="font-medium">{product.name}</span>
                {showDescriptionInButtons && product.description && (
                  <span className="text-xs opacity-70 mt-1 line-clamp-2">
                    {product.description}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Searchable Dropdown for All Products */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
          <Package className="w-4 h-4" />
          {featuredProducts.length > 0 ? 'Todos os Produtos' : 'Selecionar Produto'}
        </p>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                {selectedProduct ? (
                  <span>{selectedProduct.name}</span>
                ) : (
                  <span className="text-muted-foreground">{placeholder}</span>
                )}
              </div>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput placeholder={placeholder} />
              <CommandList>
                <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                <CommandGroup>
                  {allProducts.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={product.name}
                      onSelect={() => handleSelect(product)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Check
                          className={cn(
                            'h-4 w-4',
                            selectedProductId === product.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span>{product.name}</span>
                            {product.is_featured && (
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            )}
                          </div>
                          {product.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Show selected product if selected via dropdown */}
      {selectedProduct && !featuredProducts.find(p => p.id === selectedProductId) && (
        <div className="bg-primary/10 rounded-lg p-3 flex items-center gap-2">
          <Check className="w-4 h-4 text-primary" />
          <span className="font-medium">Selecionado: {selectedProduct.name}</span>
        </div>
      )}
    </div>
  );
}
