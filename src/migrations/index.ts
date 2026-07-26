import * as migration_20260608_121434 from './20260608_121434';
import * as migration_20260615_091211_redirects_manager from './20260615_091211_redirects_manager';
import * as migration_20260616_075715_add_carts_and_product_attributes from './20260616_075715_add_carts_and_product_attributes';
import * as migration_20260617_094038 from './20260617_094038';
import * as migration_20260619_063815_add_site_settings_google_map_url from './20260619_063815_add_site_settings_google_map_url';
import * as migration_20260625_044942_update_media_sizes from './20260625_044942_update_media_sizes';
import * as migration_20260629_090136 from './20260629_090136';
import * as migration_20260630_075143_add_site_settings_payment_fields from './20260630_075143_add_site_settings_payment_fields';
import * as migration_20260705_090000 from './20260705_090000';
import * as migration_20260712_081600_add_media_import_fields from './20260712_081600_add_media_import_fields';
import * as migration_20260717_043357_add_col_new from './20260717_043357_add_col_new';
import * as migration_20260718_142438 from './20260718_142438';
import * as migration_20260719_050200_add_blog_comment_parent from './20260719_050200_add_blog_comment_parent';
import * as migration_20260719_075325 from './20260719_075325';
import * as migration_20260720_153323 from './20260720_153323';
import * as migration_20260721_140856_add_product_search_keywords from './20260721_140856_add_product_search_keywords';
import * as migration_20260725_083819_silo_phase_1_3_fields from './20260725_083819_silo_phase_1_3_fields';
import * as migration_20260725_123754 from './20260725_123754';
import * as migration_20260726_030821 from './20260726_030821';
import * as migration_20260726_042909_add_media_description from './20260726_042909_add_media_description';
import * as migration_20260726_055313 from './20260726_055313';

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
    name: '20260625_044942_update_media_sizes',
  },
  {
    up: migration_20260629_090136.up,
    down: migration_20260629_090136.down,
    name: '20260629_090136',
  },
  {
    up: migration_20260630_075143_add_site_settings_payment_fields.up,
    down: migration_20260630_075143_add_site_settings_payment_fields.down,
    name: '20260630_075143_add_site_settings_payment_fields',
  },
  {
    up: migration_20260705_090000.up,
    down: migration_20260705_090000.down,
    name: '20260705_090000',
  },
  {
    up: migration_20260712_081600_add_media_import_fields.up,
    down: migration_20260712_081600_add_media_import_fields.down,
    name: '20260712_081600_add_media_import_fields',
  },
  {
    up: migration_20260717_043357_add_col_new.up,
    down: migration_20260717_043357_add_col_new.down,
    name: '20260717_043357_add_col_new',
  },
  {
    up: migration_20260718_142438.up,
    down: migration_20260718_142438.down,
    name: '20260718_142438',
  },
  {
    up: migration_20260719_050200_add_blog_comment_parent.up,
    down: migration_20260719_050200_add_blog_comment_parent.down,
    name: '20260719_050200_add_blog_comment_parent',
  },
  {
    up: migration_20260719_075325.up,
    down: migration_20260719_075325.down,
    name: '20260719_075325',
  },
  {
    up: migration_20260720_153323.up,
    down: migration_20260720_153323.down,
    name: '20260720_153323',
  },
  {
    up: migration_20260721_140856_add_product_search_keywords.up,
    down: migration_20260721_140856_add_product_search_keywords.down,
    name: '20260721_140856_add_product_search_keywords',
  },
  {
    up: migration_20260725_083819_silo_phase_1_3_fields.up,
    down: migration_20260725_083819_silo_phase_1_3_fields.down,
    name: '20260725_083819_silo_phase_1_3_fields',
  },
  {
    up: migration_20260725_123754.up,
    down: migration_20260725_123754.down,
    name: '20260725_123754',
  },
  {
    up: migration_20260726_030821.up,
    down: migration_20260726_030821.down,
    name: '20260726_030821',
  },
  {
    up: migration_20260726_042909_add_media_description.up,
    down: migration_20260726_042909_add_media_description.down,
    name: '20260726_042909_add_media_description',
  },
  {
    up: migration_20260726_055313.up,
    down: migration_20260726_055313.down,
    name: '20260726_055313'
  },
];
