import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export class PluginService {
  private pluginsPath: string;

  constructor() {
    this.pluginsPath = path.join(app.getPath('userData'), 'plugins');
    if (!fs.existsSync(this.pluginsPath)) {
      fs.mkdirSync(this.pluginsPath, { recursive: true });
    }
  }

  private loadPluginModule(filename: string): any {
    const fullPath = path.join(this.pluginsPath, filename);
    // Invalidate require cache to allow reloading updated plugins
    delete require.cache[require.resolve(fullPath)];
    return require(fullPath);
  }

  public async listPlugins(): Promise<{ success: boolean; plugins?: any[]; error?: string }> {
    try {
      const files = fs.readdirSync(this.pluginsPath).filter(f => f.endsWith('.js'));
      const plugins = [];
      
      for (const file of files) {
        try {
          const mod = this.loadPluginModule(file);
          if (mod && mod.metadata) {
            plugins.push({
              ...mod.metadata,
              filename: file
            });
          }
        } catch (e) {
          console.error(`Failed to load plugin ${file}:`, e);
        }
      }
      return { success: true, plugins };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async installPlugin(sourcePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!fs.existsSync(sourcePath)) throw new Error('Source file not found');
      if (!sourcePath.endsWith('.js')) throw new Error('Only .js plugin files are supported');

      const filename = path.basename(sourcePath);
      const destPath = path.join(this.pluginsPath, filename);
      
      fs.copyFileSync(sourcePath, destPath);

      // Verify it loads correctly
      try {
        const mod = this.loadPluginModule(filename);
        if (!mod.metadata || !mod.metadata.id) {
          throw new Error('Plugin does not export valid metadata.id');
        }
      } catch (err) {
        fs.unlinkSync(destPath); // rollback
        throw err;
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async uninstallPlugin(pluginId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { plugins } = await this.listPlugins();
      if (!plugins) throw new Error('Cannot read plugins');

      const plugin = plugins.find(p => p.id === pluginId);
      if (!plugin) throw new Error('Plugin not found');

      fs.unlinkSync(path.join(this.pluginsPath, plugin.filename));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async invokePlugin(pluginId: string, action: string, args: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { plugins } = await this.listPlugins();
      if (!plugins) throw new Error('Cannot read plugins');

      const pluginMeta = plugins.find(p => p.id === pluginId);
      if (!pluginMeta) throw new Error(`Plugin ${pluginId} not found`);

      const mod = this.loadPluginModule(pluginMeta.filename);
      if (typeof mod[action] !== 'function') {
        throw new Error(`Plugin does not implement action: ${action}`);
      }

      const result = await mod[action](args);
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
