-- Follow-up to add_arte_member_admin_approval; index the reviewer FK for account deletion.
CREATE INDEX arte_admin_requests_reviewed_by_idx ON private.arte_admin_requests(reviewed_by);
