const db = require('../db');
require('dotenv').config();

/**
 * Script para actualizar las URLs de imágenes relativas a absolutas
 * Ejecutar con: node src/scripts/fix-image-urls.js
 */

async function fixImageUrls() {
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  
  console.log(`🔧 Actualizando URLs de imágenes...`);
  console.log(`📍 Backend URL: ${backendUrl}`);

  try {
    // Actualizar assembly_image_url
    const result1 = await db.query(`
      UPDATE scaffolds 
      SET assembly_image_url = CONCAT($1, assembly_image_url)
      WHERE assembly_image_url LIKE '/uploads/%'
    `, [backendUrl]);
    
    console.log(`✅ Actualizadas ${result1.rowCount} URLs de assembly_image_url`);

    // Actualizar disassembly_image_url
    const result2 = await db.query(`
      UPDATE scaffolds 
      SET disassembly_image_url = CONCAT($1, disassembly_image_url)
      WHERE disassembly_image_url LIKE '/uploads/%'
    `, [backendUrl]);
    
    console.log(`✅ Actualizadas ${result2.rowCount} URLs de disassembly_image_url`);

    console.log(`\n✨ Migración completada exitosamente`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al actualizar URLs:', error);
    process.exit(1);
  }
}

fixImageUrls();
