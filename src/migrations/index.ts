import * as migration_20260608_121434 from './20260608_121434';
import * as migration_20260615_091211_redirects_manager from './20260615_091211_redirects_manager';
import * as migration_20260616_075715_add_carts_and_product_attributes from './20260616_075715_add_carts_and_product_attributes';

export const migrations = [
  {
    up: migration_20260608_121434.up,
    down: migration_20260608_121434.down,
    name: '20260608_121434',
  },
  {
    up: migration_20260615_091211_redirects_manager.up,
    down: migration_20260615_091211_redirects_manager.down,
    name: '20260615_091211_redirects_manager',
  },
  {
    up: migration_20260616_075715_add_carts_and_product_attributes.up,
    down: migration_20260616_075715_add_carts_and_product_attributes.down,
    name: '20260616_075715_add_carts_and_product_attributes'
  },
];
