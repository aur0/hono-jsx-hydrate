export interface HonoJsxHydrateVitePlugin {
  name: string
  enforce: 'pre'
  config(): {
    resolve: {
      alias: Array<{ find: RegExp; replacement: string }>
    }
  }
}

export declare function honoJsxHydrateVitePlugin(): HonoJsxHydrateVitePlugin
