export class Task {
  public id: string
  public receivedAt: Date
  public sentAt: Date | null
  public instanceId: string | null
  public responseReceivedAt: Date | null
  public duration: number | null
  public workflowName: string
  public workflowParams: any
  public success: boolean | null
  public errorMessage: string | null

  constructor(id: string, workflowName: string, workflowParams: any) {
    this.id = id
    this.workflowName = workflowName
    this.workflowParams = workflowParams
    this.receivedAt = new Date()
    this.sentAt = null
    this.instanceId = null
    this.responseReceivedAt = null
    this.duration = null
    this.success = null
    this.errorMessage = null
  }
}
