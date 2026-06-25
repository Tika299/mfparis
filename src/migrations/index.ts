import * as migration_20260608_121434 from './20260608_121434';
import * as migration_20260615_091211_redirects_manager from './20260615_091211_redirects_manager';
import * as migration_20260616_075715_add_carts_and_product_attributes from './20260616_075715_add_carts_and_product_attributes';
import * as migration_20260617_094038 from './20260617_094038';
import * as migration_20260619_063815_add_site_settings_google_map_url from './20260619_063815_add_site_settings_google_map_url';
import * as migration_20260625_044942_update_media_sizes from './20260625_044942_update_media_sizes';

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
    name: '20260616_075715_add_carts_and_product_attributes',
  },
  {
    up: migration_20260617_094038.up,
    down: migration_20260617_094038.down,
    name: '20260617_094038',
  },
  {
    up: migration_20260619_063815_add_site_settings_google_map_url.up,
    down: migration_20260619_063815_add_site_settings_google_map_url.down,
    name: '20260619_063815_add_site_settings_google_map_url',
  },
  {
    up: migration_20260625_044942_update_media_sizes.up,
    down: migration_20260625_044942_update_media_sizes.down,
    name: '20260625_044942_update_media_sizes'
  },
];
