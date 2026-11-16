ALTER TABLE `link` ADD `delivery_json` text;
--> statement-breakpoint
-- The editor used to keep these settings in metadata under `__openlink_ui`; move them to their own column.
UPDATE `link`
SET
  `delivery_json` = json_extract(`metadata_json`, '$.__openlink_ui'),
  `metadata_json` = nullif(json_remove(`metadata_json`, '$.__openlink_ui'), '{}')
WHERE json_valid(`metadata_json`) AND json_type(`metadata_json`, '$.__openlink_ui') = 'object';
