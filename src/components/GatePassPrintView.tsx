import React from 'react';

interface GatePassProps {
  order: {
    order_number: string;
    customer_id: string | null;
    product: string;
    quantity: number;
    total_amount: number;
    driver_name?: string;
    vehicle_plate_no?: string;
    quantity_unit?: string;
    order_date: string;
    customers?: {
      name: string;
      company: string | null;
    };
  };
  customer: {
    name: string;
    company: string | null;
    email?: string;
  } | null;
}

const GatePassPrintView = ({ order, customer }: GatePassProps) => {
  const currentDate = new Date().toLocaleDateString();

  return (
    // ✅ ACCESSIBILITY: Added role="document" for print view semantics
    <div className="gate-pass-container" role="document" aria-label="Gate Pass and Delivery Note">
      {/* Header */}
      <div className="header">
        <div className="logo-section">
          <h1>YIZUTA Food Complex</h1>
          <p>Management System</p>
        </div>
        <div className="doc-info">
          <table className="info-table">
            <tbody>
              <tr><td><strong>Document Title:</strong></td><td>DELIVERY NOTE & GATE PASS</td></tr>
              <tr><td><strong>Document No:</strong></td><td>GP-{order.order_number}</td></tr>
              <tr><td><strong>Date:</strong></td><td>{currentDate}</td></tr>
              <tr><td><strong>Page No:</strong></td><td>1 of 1</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer & Transport Info */}
      <div className="transport-info">
        <div className="col">
          <p><strong>Customer:</strong> {customer?.name || order.customers?.name || 'N/A'}</p>
          <p><strong>Address:</strong> {customer?.company || 'N/A'}</p>
          <p><strong>Sales Order No:</strong> {order.order_number}</p>
        </div>
        <div className="col">
          <p><strong>Driver Name:</strong> {order.driver_name || '________________'}</p>
          <p><strong>Vehicle Plate No:</strong> {order.vehicle_plate_no || '________________'}</p>
          <p><strong>Mode of Transport:</strong> Road / Truck</p>
        </div>
      </div>

      {/* Goods Table */}
      <h3>Please release the following goods:</h3>
      <table className="goods-table">
        <thead>
          <tr>
            {/* ✅ ACCESSIBILITY: Added scope="col" to table headers */}
            <th scope="col">S.No</th>
            <th scope="col">Product Type</th>
            <th scope="col">Description</th>
            <th scope="col">Quantity</th>
            <th scope="col">Unit</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>Finished Good</td>
            <td>{order.product}</td>
            <td>{order.quantity}</td>
            <td>{order.quantity_unit || 'Boxes'}</td>
          </tr>
        </tbody>
      </table>

      {/* Signatures Section */}
      <div className="signatures">
        <div className="sig-box">
          <p><strong>Prepared By (Sales):</strong></p>
          <br />
          <p>Sign: __________________</p>
          <p>Date: {currentDate}</p>
        </div>
        <div className="sig-box">
          <p><strong>Issued By (Warehouse):</strong></p>
          <br />
          <p>Sign: __________________</p>
          <p>Date: {currentDate}</p>
        </div>
        <div className="sig-box">
          <p><strong>Received By (Driver):</strong></p>
          <br />
          <p>Sign: __________________</p>
          <p>Date: {currentDate}</p>
        </div>
      </div>

      {/* Gate Keeper Section */}
      <div className="gate-section">
        <h3>FOR GATE KEEPER USE ONLY</h3>
        <div className="gate-grid">
          <div>
            <p><strong>Check In Time:</strong> ________________</p>
            <p><strong>Check Out Time:</strong> ________________</p>
          </div>
          <div>
            <p><strong>Gate Keeper Sign:</strong> __________________</p>
            <p><strong>Security Stamp:</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GatePassPrintView;