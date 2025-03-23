import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'
import { Task } from './task'

export class History {
  private db!: Database
  private isInitialized = false

  /**
   * Initialise la connexion à la base de données et crée la table si nécessaire.
   * @param dbFilePath Chemin vers le fichier de base de données SQLite (défaut './history.db')
   */
  public async init(dbFilePath: string = './history.db'): Promise<void> {
    try {
      this.db = await open({
        filename: dbFilePath,
        driver: sqlite3.Database
      })

      await this.db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          receivedAt TEXT NOT NULL,
          sentAt TEXT,
          instanceId TEXT,
          responseReceivedAt TEXT,
          duration REAL,
          workflowName TEXT NOT NULL,
          workflowParams TEXT NOT NULL,
          success INTEGER,
          errorMessage TEXT
        )
      `)
      
      this.isInitialized = true
      console.log(`History database initialized at ${dbFilePath}`)
    } catch (error) {
      console.error('Failed to initialize history database:', error)
      throw error
    }
  }

  /**
   * Ferme la connexion à la base de données.
   */
  public async close(): Promise<void> {
    if (this.db && this.isInitialized) {
      await this.db.close()
      this.isInitialized = false
      console.log('History database connection closed')
    }
  }

  /**
   * Vérifie si la base de données est initialisée et lance une erreur sinon.
   */
  private checkInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('History database not initialized. Call init() first.')
    }
  }

  /**
   * Ajoute une nouvelle tâche à la table.
   * @param task La tâche à ajouter.
   */
  public async addTask(task: Task): Promise<void> {
    this.checkInitialized()
    
    try {
      await this.db.run(
        `INSERT INTO tasks (
            id, receivedAt, sentAt, instanceId, responseReceivedAt, duration, workflowName, workflowParams, success, errorMessage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        task.id,
        task.receivedAt.toISOString(),
        task.sentAt ? task.sentAt.toISOString() : null,
        task.instanceId,
        task.responseReceivedAt ? task.responseReceivedAt.toISOString() : null,
        task.duration,
        task.workflowName,
        JSON.stringify(task.workflowParams),
        task.success === null ? null : task.success ? 1 : 0,
        task.errorMessage
      )
    } catch (error) {
      console.error(`Failed to add task ${task.id} to history:`, error)
      throw error
    }
  }

  /**
   * Met à jour une tâche existante dans la table.
   * @param task La tâche à mettre à jour.
   */
  public async updateTask(task: Task): Promise<void> {
    this.checkInitialized()
    
    try {
      await this.db.run(
        `UPDATE tasks 
         SET sentAt = ?, 
             instanceId = ?, 
             responseReceivedAt = ?, 
             duration = ?, 
             success = ?, 
             errorMessage = ? 
         WHERE id = ?`,
        task.sentAt ? task.sentAt.toISOString() : null,
        task.instanceId,
        task.responseReceivedAt ? task.responseReceivedAt.toISOString() : null,
        task.duration,
        task.success === null ? null : task.success ? 1 : 0,
        task.errorMessage,
        task.id
      )
    } catch (error) {
      console.error(`Failed to update task ${task.id} in history:`, error)
      throw error
    }
  }

  /**
   * Retourne le nombre total d'images générées (chaque tâche correspond à une image).
   */
  public async getTotalImagesGenerated(): Promise<number> {
    this.checkInitialized()
    
    try {
      const row = await this.db.get<{ count: number }>(`SELECT COUNT(*) as count FROM tasks`)
      return row?.count ?? 0
    } catch (error) {
      console.error('Failed to get total images generated:', error)
      throw error
    }
  }

  /**
   * Regroupe les tâches par jour.
   * Retourne un tableau d'objets avec la date (YYYY-MM-DD) et le nombre de tâches ce jour-là.
   * @deprecated Use getTimelineReceived('day') instead
   */
  public async groupByDay() {
    this.checkInitialized()
    return this.getTimelineReceived('day')
  }

  /**
   * Regroupe les tâches par heure.
   * Retourne un tableau d'objets avec la date et l'heure (YYYY-MM-DD HH) et le nombre de tâches pendant cette heure.
   * @deprecated Use getTimelineReceived('hour') instead
   */
  public async groupByHour() {
    this.checkInitialized()
    return this.getTimelineReceived('hour')
  }

  /**
   * Regroupe les tâches par minute.
   * Retourne un tableau d'objets avec la date, l'heure et la minute (YYYY-MM-DD HH:MM) et le nombre de tâches pendant cette minute.
   * @deprecated Use getTimelineReceived('minute') instead
   */
  public async groupByMinute() {
    this.checkInitialized()
    return this.getTimelineReceived('minute')
  }

  // ================================================
  // 1. Vue d'ensemble (Global Metrics)
  // ================================================
  /**
   * Retourne les métriques globales :
   * - totalTasks : nombre total de tâches traitées
   * - successRate : pourcentage de tâches réussies
   * - averageDuration : durée moyenne d'exécution (en secondes)
   * - totalImages : nombre d'images générées (chaque tâche correspond à une image)
   */
  public async getGlobalMetrics(): Promise<{
    totalTasks: number;
    successRate: number;
    averageDuration: number;
    totalImages: number;
  }> {
    this.checkInitialized()
    
    try {
      const totalRow = await this.db.get<{ total: number }>(`SELECT COUNT(*) as total FROM tasks`)
      const successRow = await this.db.get<{ successes: number }>(
        `SELECT COUNT(*) as successes FROM tasks WHERE success = 1`
      )
      const avgRow = await this.db.get<{ avgDuration: number }>(
        `SELECT AVG(duration) as avgDuration FROM tasks WHERE duration IS NOT NULL`
      )

      const totalTasks = totalRow?.total ?? 0
      const successRate = totalTasks > 0 ? ((successRow?.successes ?? 0) / totalTasks) * 100 : 0
      const averageDuration = avgRow?.avgDuration ?? 0
      const totalImages = totalTasks

      return { totalTasks, successRate, averageDuration, totalImages }
    } catch (error) {
      console.error('Failed to get global metrics:', error)
      throw error
    }
  }

  // ================================================
  // 2. Évolution des Tâches (Timeline)
  // ================================================
  /**
   * Méthode générique pour grouper les tâches selon un champ date et un format.
   * @param field Le champ de date (ex: 'receivedAt' ou 'responseReceivedAt')
   * @param groupBy Le format de groupage : 'day' | 'hour' | 'minute'
   */
  private async getTimelineData(field: string, groupBy: 'day' | 'hour' | 'minute') {
    this.checkInitialized()
    
    try {
      let format: string
      switch (groupBy) {
        case 'day':
          format = '%Y-%m-%d'
          break
        case 'hour':
          format = '%Y-%m-%d %H'
          break
        case 'minute':
          format = '%Y-%m-%d %H:%M'
          break
        default:
          format = '%Y-%m-%d'
      }

      const whereClause = field === 'responseReceivedAt' ? `WHERE ${field} IS NOT NULL` : ''

      const query = `
        SELECT strftime('${format}', ${field}) as time, COUNT(*) as count
        FROM tasks
        ${whereClause}
        GROUP BY time
        ORDER BY time
      `
      interface TimelineRow {
        time: string;
        count: number;
      }
      
      const rows = await this.db.all<Array<TimelineRow>>(query)
      return rows
    } catch (error) {
      console.error(`Failed to get timeline data for field '${field}' grouped by '${groupBy}':`, error)
      throw error
    }
  }

  /**
   * Retourne la timeline basée sur le timestamp de réception (receivedAt)
   */
  public async getTimelineReceived(groupBy: 'day' | 'hour' | 'minute') {
    this.checkInitialized()
    return this.getTimelineData('receivedAt', groupBy)
  }

  /**
   * Retourne la timeline basée sur le timestamp de traitement (responseReceivedAt)
   */
  public async getTimelineProcessed(groupBy: 'day' | 'hour' | 'minute') {
    this.checkInitialized()
    return this.getTimelineData('responseReceivedAt', groupBy)
  }

  // ================================================
  // 3. Répartition des Statuts de Tâches (Status Breakdown)
  // ================================================
  /**
   * Retourne le nombre de tâches réussies et échouées.
   * De plus, fournit une répartition des messages d'erreur pour les tâches en échec.
   */
  public async getStatusBreakdown(): Promise<{
    successCount: number;
    failureCount: number;
    errorDetails: Array<{ errorMessage: string; count: number }>;
  }> {
    this.checkInitialized()
    
    try {
      const successRow = await this.db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM tasks WHERE success = 1`
      )
      const failureRow = await this.db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM tasks WHERE success = 0`
      )
      const errorDetails = await this.db.all<Array<{ errorMessage: string; count: number }>>(`
        SELECT errorMessage, COUNT(*) as count 
        FROM tasks 
        WHERE success = 0 AND errorMessage IS NOT NULL 
        GROUP BY errorMessage
      `)
      return {
        successCount: successRow?.count ?? 0,
        failureCount: failureRow?.count ?? 0,
        errorDetails: errorDetails || []
      }
    } catch (error) {
      console.error('Failed to get status breakdown:', error)
      throw error
    }
  }

  // ================================================
  // 4. Distribution des Durées d’Exécution (Task Duration)
  // ================================================
  /**
   * Retourne la liste de toutes les durées d'exécution des tâches (en secondes)
   * pour alimenter un histogramme ou un box plot.
   */
  public async getTaskDurationDistribution(): Promise<number[]> {
    this.checkInitialized()
    
    try {
      const rows = await this.db.all<Array<{ duration: number }>>(
        `SELECT duration FROM tasks WHERE duration IS NOT NULL ORDER BY duration`
      )
      return rows.map((row) => row.duration)
    } catch (error) {
      console.error('Failed to get task duration distribution:', error)
      throw error
    }
  }

  // ================================================
  // 5. Performance par Instance (Instance Performance)
  // ================================================
  /**
   * Retourne pour chaque instance (non null) :
   * - le nombre de tâches traitées
   * - la durée moyenne d'exécution
   */
  public async getInstancePerformance(): Promise<Array<{
    instanceId: string;
    taskCount: number;
    averageDuration: number;
  }>> {
    this.checkInitialized()
    
    try {
      const rows = await this.db.all<Array<{
        instanceId: string;
        taskCount: number;
        averageDuration: number;
      }>>(`
        SELECT instanceId, COUNT(*) as taskCount, AVG(duration) as averageDuration
        FROM tasks
        WHERE instanceId IS NOT NULL
        GROUP BY instanceId
        ORDER BY taskCount DESC
      `)
      return rows || []
    } catch (error) {
      console.error('Failed to get instance performance:', error)
      throw error
    }
  }

  // ================================================
  // 6. Répartition des Workflows (Workflow Breakdown)
  // ================================================
  /**
   * Retourne le nombre de tâches par workflow.
   */
  public async getWorkflowBreakdown(): Promise<Array<{
    workflowName: string; 
    count: number;
  }>> {
    this.checkInitialized()
    
    try {
      const rows = await this.db.all<Array<{ 
        workflowName: string; 
        count: number;
      }>>(`
        SELECT workflowName, COUNT(*) as count
        FROM tasks
        GROUP BY workflowName
        ORDER BY count DESC
      `)
      return rows || []
    } catch (error) {
      console.error('Failed to get workflow breakdown:', error)
      throw error
    }
  }

  // ================================================
  // 7. Temps de Latence et Queue (Latency & Queue Metrics)
  // ================================================
  /**
   * Retourne la latence moyenne initiale (entre receivedAt et sentAt)
   * et le temps moyen de traitement (entre sentAt et responseReceivedAt)
   * en secondes.
   */
  public async getLatencyMetrics(): Promise<{
    averageInitialLatency: number;
    averageProcessingTime: number;
  }> {
    this.checkInitialized()
    
    try {
      const initialRow = await this.db.get<{ avgInitialLatency: number }>(`
        SELECT AVG((julianday(sentAt) - julianday(receivedAt)) * 86400) as avgInitialLatency
        FROM tasks
        WHERE sentAt IS NOT NULL
      `)
      const processingRow = await this.db.get<{ avgProcessingTime: number }>(`
        SELECT AVG((julianday(responseReceivedAt) - julianday(sentAt)) * 86400) as avgProcessingTime
        FROM tasks
        WHERE sentAt IS NOT NULL AND responseReceivedAt IS NOT NULL
      `)
      return {
        averageInitialLatency: initialRow?.avgInitialLatency ?? 0,
        averageProcessingTime: processingRow?.avgProcessingTime ?? 0
      }
    } catch (error) {
      console.error('Failed to get latency metrics:', error)
      throw error
    }
  }
}
