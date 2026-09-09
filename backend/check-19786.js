const mongoose = require('mongoose');
require('dotenv').config();

const CuentaPorPagar = require('./models/CuentaPorPagar');
const Compra = require('./models/Compra');
const Proveedor = require('./models/Proveedor');

async function check19786() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    const cuenta = await CuentaPorPagar.findOne({ receiptNumber: '19786' }).populate('compra');
    
    if (!cuenta) {
      console.log('❌ Cuenta 19786 no encontrada');
      process.exit(0);
    }

    console.log('📋 Estado actual de factura 19786:');
    console.log('Factura:', cuenta.receiptNumber);
    console.log('Vencimiento actual:', cuenta.dueDate.toISOString().split('T')[0]);
    console.log('Status:', cuenta.status);
    console.log('Saldo:', cuenta.saldo);
    
    if (cuenta.compra) {
      console.log('\n📦 Compra asociada:');
      console.log('Fecha compra:', cuenta.compra.date.toISOString().split('T')[0]);
      console.log('Proveedor ID:', cuenta.compra.proveedor);
      
      const proveedor = await Proveedor.findById(cuenta.compra.proveedor);
      if (proveedor) {
        console.log('\n👤 Proveedor:');
        console.log('Nombre:', proveedor.name);
        console.log('Días de crédito:', proveedor.creditDays);
        
        const vencimientoCorrecto = new Date(cuenta.compra.date);
        vencimientoCorrecto.setDate(vencimientoCorrecto.getDate() + proveedor.creditDays);
        
        console.log('\n📊 Cálculo:');
        console.log('Vencimiento correcto (compra + días):', vencimientoCorrecto.toISOString().split('T')[0]);
        
        const diferencia = vencimientoCorrecto.getTime() - cuenta.dueDate.getTime();
        const diasDiferencia = Math.round(diferencia / (1000 * 60 * 60 * 24));
        
        console.log('Días de diferencia:', diasDiferencia);
        
        if (Math.abs(diasDiferencia) > 1) {
          console.log('\n⚠️  El vencimiento es INCORRECTO');
        } else {
          console.log('\n✅ El vencimiento es CORRECTO');
        }
      }
    }
    
    mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

check19786();
