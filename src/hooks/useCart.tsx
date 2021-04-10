import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productsCart = [...cart];
      const productExistsInCart = productsCart.find(element => element.id === productId);

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;
      const currentAmount = productExistsInCart ? productExistsInCart.amount : 0;
      const finalAmount = currentAmount + 1;

      if(finalAmount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productExistsInCart) {
        productExistsInCart.amount = finalAmount;
      } else {
        const product = await api.get(`/products/${productId}`);
        const finalProduct = {
          ...product.data,
          amount: 1,
        }
        productsCart.push(finalProduct);
      }

      setCart(productsCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(productsCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const foundProduct = cart.find(product => product.id === productId);
      if (foundProduct) {
        const productsCart = cart.filter(product => product.id !== foundProduct.id);
        setCart(productsCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(productsCart));
      } else {
        throw Error();
      }

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) return;
      const updatedCart = [...cart];
      const foundProduct = cart.find(product => product.id === productId);
      if(foundProduct) {
        const stock = await api.get(`/stock/${productId}`);
        const stockAmount = stock.data.amount;

        if(amount > stockAmount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        } else {
          foundProduct.amount = amount;
          setCart(updatedCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        }
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
