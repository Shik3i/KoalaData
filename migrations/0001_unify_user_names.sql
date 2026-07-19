UPDATE `users` SET `display_name` = `username` WHERE `display_name` <> `username`;--> statement-breakpoint
UPDATE `metric_definitions`
SET `aggregation` = CASE `aggregation`
	WHEN 'avg' THEN 'average'
	WHEN 'min' THEN 'minimum'
	WHEN 'max' THEN 'maximum'
	ELSE `aggregation`
END
WHERE `aggregation` IN ('avg', 'min', 'max');--> statement-breakpoint
CREATE TRIGGER `users_display_name_after_insert`
AFTER INSERT ON `users`
WHEN NEW.`display_name` <> NEW.`username`
BEGIN
	UPDATE `users` SET `display_name` = NEW.`username` WHERE `id` = NEW.`id`;
END;--> statement-breakpoint
CREATE TRIGGER `users_display_name_after_update`
AFTER UPDATE OF `username`, `display_name` ON `users`
WHEN NEW.`display_name` <> NEW.`username`
BEGIN
	UPDATE `users` SET `display_name` = NEW.`username` WHERE `id` = NEW.`id`;
END;
