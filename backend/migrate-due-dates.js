/**
 * Script de migración para corregir vencimientos de cuentas por pagar
 * 
 * Este script recalcula los vencimientos de cuentas por pagar existentes
 * utilizando la fecha real de compra (Compra.date) en lugar de la fecha de captura.
 * 
 * USO:
 * 1. Modo dry-run (solo muestra cambios, no aplica):
 *    node migrate-due-dates.js
 * 
 * 2. Modo aplicación (aplica los cambios):
 *    node migrate-due-dates.js --apply
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Modelos
const CuentaPorPagar = require('./models/CuentaPorPagar');
const Compra = require('./models/Compra');
const Proveedor = require('./models/Proveedor');

const applyChanges = process.argv.includes('--apply');

async function migrateDueDates() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/erp');
    console.log('✅ Conectado a MongoDB\n');

    // Buscar TODAS las cuentas por pagar (no solo pendientes/vencidas)
    const cuentas = await CuentaPorPagar.find({}).populate('compra');

    console.log(`📊 Encontradas ${cuentas.length} cuentas por pagar pendientes/vencidas\n`);

    const cambios = [];

    for (const cuenta of cuentas) {
      const compra = cuenta.compra;
      
      if (!compra || !compra.date) {
        console.log(`⚠️  Cuenta ${cuenta._id}: Sin compra o sin fecha de compra - OMITIDA`);
        continue;
      }

      const proveedor = await Proveedor.findById(compra.proveedor);
      
      if (!proveedor) {
        console.log(`⚠️  Cuenta ${cuenta._id}: Proveedor no encontrado - OMITIDA`);
        continue;
      }

      // Calcular vencimiento correcto: fecha de compra + días de crédito
      const vencimientoCorrecto = new Date(compra.date);
      vencimientoCorrecto.setDate(vencimientoCorrecto.getDate() + proveedor.creditDays);

      const vencimientoActual = cuenta.dueDate;
      const diferencia = vencimientoCorrecto.getTime() - vencimientoActual.getTime();
      const diasDiferencia = Math.round(diferencia / (1000 * 60 * 60 * 24));

      // Solo registrar si hay diferencia significativa (más de 1 día)
      if (Math.abs(diasDiferencia) > 1) {
        cambios.push({
          cuentaId: cuenta._id,
          factura: cuenta.receiptNumber || 'N/A',
          proveedor: proveedor.name,
          fechaCompra: compra.date.toISOString().split('T')[0],
          creditDays: proveedor.creditDays,
          vencimientoActual: vencimientoActual.toISOString().split('T')[0],
          vencimientoCorrecto: vencimientoCorrecto.toISOString().split('T')[0],
          diasDiferencia,
          cuenta
        });
      }
    }

    console.log(`\n📋 Se encontraron ${cambios.length} cuentas con vencimiento incorrecto:\n`);

    if (cambios.length === 0) {
      console.log('✅ No se encontraron cuentas con vencimiento incorrecto.');
      process.exit(0);
    }

    // Mostrar tabla de cambios
    console.log('┌──────────────────────┬──────────┬──────────────┬──────────────┬──────────────┬──────────────┐');
    console.log('│ Factura              │ Proveedor │ Fecha Compra │ Venc. Actual │ Venc. Correc │ Días Difer  │');
    console.log('├──────────────────────┼──────────┼──────────────┼──────────────┼──────────────┼──────────────┤');
    
    cambios.forEach(c => {
      const factura = c.factura.padEnd(20).substring(0, 20);
      const proveedor = c.proveedor.padEnd(10).substring(0, 10);
      const fechaCompra = c.fechaCompra;
      const vencActual = c.vencimientoActual;
      const vencCorrect = c.vencimientoCorrecto;
      const diasDiff = (c.diasDiferencia > 0 ? `+${c.diasDiferencia}` : c.diasDiferencia.toString()).padStart(12);
      
      console.log(`│ ${factura} │ ${proveedor} │ ${fechaCompra} │ ${vencActual} │ ${vencCorrect} │ ${diasDiff} │`);
    });
    
    console.log('└──────────────────────┴──────────┴──────────────┴──────────────┴──────────────┴──────────────┘\n');

    if (!applyChanges) {
      console.log('🔍 MODO DRY-RUN: No se aplicaron cambios.');
      console.log('💡 Para aplicar los cambios, ejecuta: node migrate-due-dates.js --apply\n');
      process.exit(0);
    }

    // Aplicar cambios
    console.log('🔧 Aplicando cambios...\n');

    for (const cambio of cambios) {
      const { cuenta, vencimientoCorrecto } = cambio;
      
      cuenta.dueDate = vencimientoCorrecto;
      
      // Recalcular discountDeadline si existe
      if (cambio.cuenta.discountDeadline) {
        const discountDeadline = new Date(cambio.fechaCompra);
        discountDeadline.setDate(discountDeadline.getDate() + cambio.creditDays);
        cuenta.discountDeadline = discountDeadline;
      }
      
      await cuenta.save();
      
      console.log(`✅ Cuenta ${cambio.factura}: Vencimiento actualizado a ${cambio.vencimientoCorrecto}`);
    }

    console.log(`\n✅ Migración completada. Se corrigieron ${cambios.length} cuentas por pagar.`);
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

migrateDueDates();
