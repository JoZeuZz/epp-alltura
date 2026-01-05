const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');
const db = require('../db');

// All dashboard routes are protected
router.use(authMiddleware);

router.use(isAdmin);

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  try {
    // Estadísticas de metros cúbicos por estado
    const cubicMetersStatsRes = await db.query(`
      SELECT 
        SUM(CASE WHEN assembly_status = 'assembled' THEN cubic_meters ELSE 0 END) as assembled_cubic_meters,
        SUM(CASE WHEN assembly_status = 'disassembled' THEN cubic_meters ELSE 0 END) as disassembled_cubic_meters,
        SUM(CASE WHEN assembly_status = 'in_progress' THEN cubic_meters ELSE 0 END) as in_progress_cubic_meters,
        SUM(cubic_meters) as total_cubic_meters
      FROM scaffolds
    `);
    const cubicStats = cubicMetersStatsRes.rows[0];

    // Estadísticas de andamios por estado
    const scaffoldStatsRes = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE assembly_status = 'assembled') as assembled_count,
        COUNT(*) FILTER (WHERE assembly_status = 'disassembled') as disassembled_count,
        COUNT(*) FILTER (WHERE assembly_status = 'in_progress') as in_progress_count,
        COUNT(*) as total_scaffolds,
        COUNT(*) FILTER (WHERE card_status = 'green') as green_cards_count,
        COUNT(*) FILTER (WHERE card_status = 'red') as red_cards_count
      FROM scaffolds
    `);
    const scaffoldStats = scaffoldStatsRes.rows[0];

    // Proyectos activos
    const activeProjectsRes = await db.query("SELECT COUNT(*) as total FROM projects WHERE status = 'active'");
    const activeProjects = parseInt(activeProjectsRes.rows[0].total, 10);

    // Clientes activos
    const activeClientsRes = await db.query("SELECT COUNT(*) as total FROM clients WHERE active = true");
    const activeClients = parseInt(activeClientsRes.rows[0].total, 10);

    // Andamios creados en las últimas 24 horas
    const recentScaffoldsCountRes = await db.query("SELECT COUNT(*) as total FROM scaffolds WHERE assembly_created_at >= NOW() - INTERVAL '24 hours'");
    const recentScaffoldsCount = parseInt(recentScaffoldsCountRes.rows[0].total, 10);

    // Últimos 5 andamios creados
    const recentScaffoldsRes = await db.query(`
      SELECT 
        s.id, s.assembly_created_at as created_at, s.project_id, s.assembly_status, s.card_status,
        p.name as project_name,
        TRIM(COALESCE(creator.first_name, '') || ' ' || COALESCE(creator.last_name, '')) as created_by_name
      FROM scaffolds s
      JOIN projects p ON s.project_id = p.id
      LEFT JOIN users creator ON s.created_by = creator.id
      ORDER BY s.assembly_created_at DESC
      LIMIT 5
    `);
    const recentScaffolds = recentScaffoldsRes.rows;

    res.json({
      // Métricas de proyectos y clientes
      activeProjects,
      activeClients,
      
      // Métricas de metros cúbicos
      totalCubicMeters: parseFloat(cubicStats.total_cubic_meters) || 0,
      assembledCubicMeters: parseFloat(cubicStats.assembled_cubic_meters) || 0,
      disassembledCubicMeters: parseFloat(cubicStats.disassembled_cubic_meters) || 0,
      inProgressCubicMeters: parseFloat(cubicStats.in_progress_cubic_meters) || 0,
      
      // Métricas de andamios
      totalScaffolds: parseInt(scaffoldStats.total_scaffolds, 10) || 0,
      assembledScaffolds: parseInt(scaffoldStats.assembled_count, 10) || 0,
      disassembledScaffolds: parseInt(scaffoldStats.disassembled_count, 10) || 0,
      inProgressScaffolds: parseInt(scaffoldStats.in_progress_count, 10) || 0,
      greenCards: parseInt(scaffoldStats.green_cards_count, 10) || 0,
      redCards: parseInt(scaffoldStats.red_cards_count, 10) || 0,
      
      // Andamios recientes
      recentScaffoldsCount,
      recentScaffolds
    });

  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

/**
 * @route   GET /api/dashboard/cubic-meters
 * @desc    Obtener estadísticas de metros cúbicos (armados vs desarmados)
 * @access  Private (Admin)
 */
router.get('/cubic-meters', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        SUM(CASE WHEN assembly_status = 'assembled' THEN cubic_meters ELSE 0 END) as assembled_cubic_meters,
        SUM(CASE WHEN assembly_status = 'disassembled' THEN cubic_meters ELSE 0 END) as disassembled_cubic_meters,
        SUM(cubic_meters) as total_cubic_meters,
        COUNT(*) FILTER (WHERE assembly_status = 'assembled') as assembled_count,
        COUNT(*) FILTER (WHERE assembly_status = 'disassembled') as disassembled_count,
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE card_status = 'green') as green_cards_count,
        COUNT(*) FILTER (WHERE card_status = 'red') as red_cards_count
      FROM scaffolds
    `;

    const { rows } = await db.query(statsQuery);
    const stats = rows[0];

    res.json({
      assembled_cubic_meters: parseFloat(stats.assembled_cubic_meters) || 0,
      disassembled_cubic_meters: parseFloat(stats.disassembled_cubic_meters) || 0,
      total_cubic_meters: parseFloat(stats.total_cubic_meters) || 0,
      assembled_count: parseInt(stats.assembled_count, 10) || 0,
      disassembled_count: parseInt(stats.disassembled_count, 10) || 0,
      total_count: parseInt(stats.total_count, 10) || 0,
      green_cards_count: parseInt(stats.green_cards_count, 10) || 0,
      red_cards_count: parseInt(stats.red_cards_count, 10) || 0,
    });

  } catch (err) {
    console.error('Error fetching cubic meters stats:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
