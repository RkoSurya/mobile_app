import React, { createContext, useContext, useState } from 'react';

interface Order {
  shopId: string;
  shopName: string;
  items: Array<{
    productCode: string;
    quantity: string;
    price: string;
    uom: string;
  }>;
  total: number;
  timestamp: string;
}

interface DailySummary {
  distance: number;
  orders: Order[];
  totalAmount: number;
}

interface OrderContextType {
  orders: Order[];
  addOrder: (order: Order) => void;
  dailySummary: DailySummary;
  updateDistance: (distance: number) => void;
  resetDay: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary>({
    distance: 0,
    orders: [],
    totalAmount: 0,
  });

  const addOrder = (order: Order) => {
    setOrders((prevOrders) => [...prevOrders, order]);
    setDailySummary((prev) => ({
      ...prev,
      orders: [...prev.orders, order],
      totalAmount: prev.totalAmount + order.total,
    }));
  };

  const updateDistance = (distance: number) => {
    setDailySummary((prev) => ({
      ...prev,
      distance,
    }));
  };

  const resetDay = () => {
    setOrders([]);
    setDailySummary({
      distance: 0,
      orders: [],
      totalAmount: 0,
    });
  };

  return (
    <OrderContext.Provider value={{ orders, addOrder, dailySummary, updateDistance, resetDay }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};
