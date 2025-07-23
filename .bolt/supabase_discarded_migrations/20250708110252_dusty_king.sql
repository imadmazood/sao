@@ .. @@
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                     WHERE constraint_name = 'lead_activity_history_lead_id_fkey' 
-                     AND table_name = 'lead_activity_history') THEN
+                     AND table_name = 'lead_activity_history') 
+  THEN
     ALTER TABLE lead_activity_history 
     ADD CONSTRAINT lead_activity_history_lead_id_fkey 
-    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
+    FOREIGN KEY (lead_id) REFERENCES leads(id);
   END IF;
   
   IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns') 
      AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'lead_activity_history_campaign_id_fkey' 
-                     AND table_name = 'lead_activity_history') THEN
+                     AND table_name = 'lead_activity_history')
+  THEN
     ALTER TABLE lead_activity_history 
     ADD CONSTRAINT lead_activity_history_campaign_id_fkey 
-    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
+    FOREIGN KEY (campaign_id) REFERENCES campaigns(id);
   END IF;
 END $$;