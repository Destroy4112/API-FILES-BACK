import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type FileVisibility = 'public' | 'private';

@Entity({ name: 'files' })
@Index('idx_files_app_tenant_created', ['app', 'tenantId', 'createdAt'])
@Index('idx_files_app_owner_created', ['app', 'ownerId', 'createdAt'])
export class File {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ length: 50 })
    app: string;

    @Index()
    @Column({ nullable: true, length: 80 })
    tenantId: string | null;

    @Index()
    @Column({ nullable: true, length: 80 })
    ownerId: string | null;

    @Column({ length: 20 })
    visibility: FileVisibility;

    @Column({ length: 120 })
    bucket: string;

    @Column({ length: 900 })
    objectKey: string;

    @Column({ length: 255 })
    originalName: string;

    @Column({ length: 120 })
    mimeType: string;

    @Column({ type: 'bigint' })
    size: number;

    @CreateDateColumn()
    createdAt: Date;
}
