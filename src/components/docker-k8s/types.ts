export interface ResourceItem {
  id: string;
  name: string;
  type: string;
  image?: string;
  status: string;
  cpu: number;
  memory: number;
  ip?: string;
  ports?: string;
  age: string;
}
