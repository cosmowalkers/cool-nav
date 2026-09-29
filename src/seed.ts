import type { NavData, NavSettings } from './types'

export const DEFAULT_SETTINGS: NavSettings = {
  engineId: 'bing',
  showClock: true,
  historyEnabled: true,
  background: { preset: 'scene', url: '', rotate: 'newtab', scrim: 'medium' },
}

export function seedData(): NavData {
  return {
    version: 2,
    settings: { ...DEFAULT_SETTINGS },
    links: [
      { id: 'l-feishu', title: '飞书', url: 'https://sugon-hpc.feishu.cn/' },
      {
        id: 'l-wiki',
        title: '个人知识库',
        url: 'https://sugon-hpc.feishu.cn/wiki/KJOEwDcRliOIcNkWdmFc98aznIe',
      },
      { id: 'l-zentao', title: '禅道', url: 'https://hpczentao.sugon.com/my/' },
      { id: 'l-gitlab', title: 'GitLab', url: 'http://gitlab.hpc.sugon.com/' },
      { id: 'l-inet', title: '研发内网', url: 'https://sugonhpc.com/inet.html' },
      { id: 'l-scnetx', title: 'SCNet X', url: 'https://www.scnet.cn/ui/gw/?page=api-keys' },
      { id: 'l-github', title: 'GitHub', url: 'https://github.com/' },
      { id: 'l-juejin', title: '掘金', url: 'https://juejin.cn/' },
    ],
  }
}
