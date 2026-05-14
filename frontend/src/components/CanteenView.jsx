import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:5000'; // Change when deploying

export default function CanteenDashboard() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // 1. Fetch initial active orders
    axios.get(`${BACKEND_URL}/api/orders/active`).then(res => setOrders(res.data));

    // 2. Listen for live updates
    const socket = io(BACKEND_URL);
    
    socket.on('new_order', (newOrder) => {
      // Optional: Play a "ding" sound here using standard JS Audio
      setOrders(prev => [...prev, newOrder]);
    });

    socket.on('order_updated', (updatedOrder) => {
      if (updatedOrder.status === 'Delivered') {
        setOrders(prev => prev.filter(o => o._id !== updatedOrder._id));
      } else {
        setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
      }
    });

    return () => socket.disconnect();
  }, []);

  const updateStatus = async (id, status) => {
    await axios.patch(`${BACKEND_URL}/api/orders/${id}/status`, { status });
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">🍳 Live Canteen Queue</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.map(order => (
          <div key={order._id} className="bg-white p-5 rounded-lg shadow-md border-l-4 border-blue-500">
            <div className="flex justify-between items-start mb-4">
              <span className="font-bold text-lg bg-gray-100 px-2 py-1 rounded">
                📍 {order.destination.replace(/_/g, ' ')}
              </span>
              <span className="text-sm text-gray-500">
                {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>

            <ul className="mb-4 space-y-2">
              {order.parsedItems.map((item, i) => (
                <li key={i} className="flex justify-between border-b pb-1">
                  <span className="capitalize">{item.name} {item.notes && <span className="text-xs text-gray-500">({item.notes})</span>}</span>
                  <span className="font-bold">x{item.quantity}</span>
                </li>
              ))}
            </ul>

            <div className="flex space-x-2">
              {order.status === 'Pending' && (
                <button 
                  onClick={() => updateStatus(order._id, 'Preparing')}
                  className="flex-1 bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600 font-medium"
                >
                  Start Preparing
                </button>
              )}
              {order.status === 'Preparing' && (
                <button 
                  onClick={() => updateStatus(order._id, 'Delivered')}
                  className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600 font-medium"
                >
                  Mark Delivered
                </button>
              )}
            </div>
          </div>
        ))}
        
        {orders.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-10">
            No active orders right now.
          </div>
        )}
      </div>
    </div>
  );
}