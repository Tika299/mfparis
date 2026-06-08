import * as migration_20260608_083719 from './20260608_083719';

export const migrations = [
  {
    up: migration_20260608_083719.up,
    down: migration_20260608_083719.down,
    name: '20260608_083719'
  },
];
