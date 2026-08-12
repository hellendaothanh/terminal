import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Play, Copy, ChevronDown, ChevronRight, FolderOpen, AlertCircle, Edit, Bookmark } from 'lucide-react';

export interface QuickCommand {
  id: string;
  title: string;
  command: string;
  description?: string;
  category: string;
  isCustom?: boolean;
}

interface QuickCommandsPanelProps {
  onExecute: (command: string) => void;
  onCopy: (command: string) => void;
  onClose: () => void;
  language?: 'vi' | 'en';
}

const DEFAULT_COMMANDS: QuickCommand[] = [
  // RHEL / CentOS
  {
    id: 'rhel-update',
    title: 'Cập nhật hệ thống (yum)',
    command: 'sudo yum update -y',
    description: 'Cập nhật tất cả các gói phần mềm lên phiên bản mới nhất',
    category: 'Red Hat / CentOS'
  },
  {
    id: 'rhel-dnf-update',
    title: 'Cập nhật hệ thống (dnf)',
    command: 'sudo dnf update -y',
    description: 'Cập nhật hệ thống trên RHEL 8+',
    category: 'Red Hat / CentOS'
  },
  {
    id: 'rhel-epel',
    title: 'Cài đặt EPEL Repository',
    command: 'sudo yum install epel-release -y',
    description: 'Thêm kho lưu trữ EPEL cho các gói bổ sung',
    category: 'Red Hat / CentOS'
  },
  {
    id: 'rhel-service-status',
    title: 'Kiểm tra trạng thái dịch vụ',
    command: 'systemctl status ',
    description: 'Xem trạng thái hoạt động của một dịch vụ hệ thống',
    category: 'Red Hat / CentOS'
  },
  {
    id: 'rhel-service-restart',
    title: 'Khởi động lại dịch vụ',
    command: 'sudo systemctl restart ',
    description: 'Khởi động lại một dịch vụ cụ thể',
    category: 'Red Hat / CentOS'
  },
  {
    id: 'rhel-firewall-status',
    title: 'Kiểm tra Firewall',
    command: 'sudo firewall-cmd --list-all',
    description: 'Xem toàn bộ quy tắc tường lửa đang áp dụng',
    category: 'Red Hat / CentOS'
  },

  // Ubuntu / Debian
  {
    id: 'ubuntu-update',
    title: 'Cập nhật danh sách gói',
    command: 'sudo apt update',
    description: 'Đồng bộ hóa danh sách gói từ kho lưu trữ',
    category: 'Ubuntu / Debian'
  },
  {
    id: 'ubuntu-upgrade',
    title: 'Nâng cấp hệ thống (apt)',
    command: 'sudo apt upgrade -y',
    description: 'Nâng cấp tất cả các gói phần mềm đã cài đặt',
    category: 'Ubuntu / Debian'
  },
  {
    id: 'ubuntu-deps',
    title: 'Cài đặt công cụ cơ bản',
    command: 'sudo apt install -y build-essential curl wget git htop dnsutils',
    description: 'Cài đặt các gói công cụ quản trị thông dụng',
    category: 'Ubuntu / Debian'
  },
  {
    id: 'ubuntu-ports',
    title: 'Kiểm tra cổng đang lắng nghe',
    command: 'sudo ss -tulpn',
    description: 'Liệt kê các tiến trình đang lắng nghe cổng TCP/UDP',
    category: 'Ubuntu / Debian'
  },
  {
    id: 'ubuntu-ufw',
    title: 'Kiểm tra trạng thái UFW',
    command: 'sudo ufw status verbose',
    description: 'Xem cấu hình tường lửa UFW chi tiết',
    category: 'Ubuntu / Debian'
  },

  // PostgreSQL
  {
    id: 'pg-cli',
    title: 'Kết nối PostgreSQL shell',
    command: 'sudo -u postgres psql',
    description: 'Mở trình quản lý dòng lệnh psql của postgres',
    category: 'PostgreSQL'
  },
  {
    id: 'pg-replication',
    title: 'Kiểm tra trạng thái Replication',
    command: 'sudo -u postgres psql -c "select * from pg_stat_replication;"',
    description: 'Xem thông tin đồng bộ dữ liệu Master-Slave',
    category: 'PostgreSQL'
  },
  {
    id: 'pg-activity',
    title: 'Truy vấn đang chạy (Active Queries)',
    command: 'sudo -u postgres psql -c "SELECT pid, age(clock_timestamp(), query_start), usename, query, state FROM pg_stat_activity WHERE state != \'idle\' ORDER BY 2 DESC;"',
    description: 'Xem các tiến trình SQL đang chạy tốn thời gian nhất',
    category: 'PostgreSQL'
  },
  {
    id: 'pg-db-size',
    title: 'Kiểm tra dung lượng Database',
    command: 'sudo -u postgres psql -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) AS size FROM pg_database;"',
    description: 'Xem dung lượng thực tế của từng database',
    category: 'PostgreSQL'
  },
  {
    id: 'pg-vacuum',
    title: 'Chạy Vacuum dọn dẹp DB',
    command: 'sudo -u postgres psql -c "VACUUM VERBOSE ANALYZE;"',
    description: 'Tối ưu hóa và giải phóng dung lượng rác',
    category: 'PostgreSQL'
  },

  // Patroni
  {
    id: 'patroni-list',
    title: 'Kiểm tra trạng thái cụm Patroni',
    command: 'patronictl -c /etc/patroni/patroni.yml list',
    description: 'Liệt kê danh sách các node và vai trò trong cụm Patroni',
    category: 'Patroni'
  },
  {
    id: 'patroni-topology',
    title: 'Xem cấu trúc Topology cụm',
    command: 'patronictl -c /etc/patroni/patroni.yml topology',
    description: 'Xem mối quan hệ replication chi tiết',
    category: 'Patroni'
  },
  {
    id: 'patroni-failover',
    title: 'Thực hiện chuyển đổi vai trò (Failover)',
    command: 'patronictl -c /etc/patroni/patroni.yml failover',
    description: 'Thủ công chuyển Master sang node phụ',
    category: 'Patroni'
  },
  {
    id: 'patroni-restart',
    title: 'Khởi động lại thành viên cụm',
    command: 'patronictl -c /etc/patroni/patroni.yml restart ',
    description: 'Khởi động lại an toàn một thành viên cụm Patroni',
    category: 'Patroni'
  },
  {
    id: 'patroni-history',
    title: 'Xem lịch sử chuyển đổi vai trò',
    command: 'patronictl -c /etc/patroni/patroni.yml history',
    description: 'Xem dòng lịch sử timeline của cụm',
    category: 'Patroni'
  },

  // HAProxy
  {
    id: 'haproxy-check',
    title: 'Kiểm tra cú pháp cấu hình',
    command: 'haproxy -c -f /etc/haproxy/haproxy.cfg',
    description: 'Đảm bảo file config không có lỗi cú pháp trước khi reload',
    category: 'HAProxy'
  },
  {
    id: 'haproxy-restart',
    title: 'Khởi động lại HAProxy',
    command: 'sudo systemctl restart haproxy',
    description: 'Khởi động lại tiến trình HAProxy',
    category: 'HAProxy'
  },
  {
    id: 'haproxy-reload',
    title: 'Tải lại cấu hình an toàn',
    command: 'sudo systemctl reload haproxy',
    description: 'Reload cấu hình không làm đứt kết nối hiện tại',
    category: 'HAProxy'
  },
  {
    id: 'haproxy-stats',
    title: 'Xem thống kê qua Unix Socket',
    command: 'echo "show info; show stat" | sudo socat stdio /run/haproxy/admin.sock',
    description: 'Đọc thông tin runtime trạng thái backend/frontend',
    category: 'HAProxy'
  },

  // Keepalived
  {
    id: 'keepalived-status',
    title: 'Trạng thái Keepalived',
    command: 'sudo systemctl status keepalived',
    description: 'Xem trạng thái hoạt động dịch vụ HA',
    category: 'Keepalived'
  },
  {
    id: 'keepalived-ip',
    title: 'Kiểm tra IP Virtual (VIP)',
    command: 'ip address show',
    description: 'Kiểm tra xem VIP có đang gán vào card mạng của node này không',
    category: 'Keepalived'
  },
  {
    id: 'keepalived-log',
    title: 'Theo dõi log Keepalived',
    command: 'sudo journalctl -u keepalived -n 100 -f',
    description: 'Xem log thời gian thực để chẩn đoán Master/Backup transition',
    category: 'Keepalived'
  },

  // Kafka
  {
    id: 'kafka-topics',
    title: 'Liệt kê danh sách Topic',
    command: 'kafka-topics.sh --bootstrap-server localhost:9092 --list',
    description: 'Xem tất cả các topic đang có trên broker',
    category: 'Kafka'
  },
  {
    id: 'kafka-topic-describe',
    title: 'Xem chi tiết Topic',
    command: 'kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic ',
    description: 'Xem số partition, replication factor, leader replica',
    category: 'Kafka'
  },
  {
    id: 'kafka-consume',
    title: 'Nhận dữ liệu thời gian thực (Consumer)',
    command: 'kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic  --from-beginning',
    description: 'Đọc dữ liệu từ topic ra màn hình terminal',
    category: 'Kafka'
  },
  {
    id: 'kafka-groups',
    title: 'Xem các Consumer Group',
    command: 'kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list',
    description: 'Liệt kê các nhóm đang tiêu thụ dữ liệu',
    category: 'Kafka'
  },
  {
    id: 'kafka-group-describe',
    title: 'Chi tiết Consumer Group & Lag',
    command: 'kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group ',
    description: 'Kiểm tra lag offset của consumer group',
    category: 'Kafka'
  },

  // MongoDB
  {
    id: 'mongo-shell',
    title: 'Mở MongoDB Shell',
    command: 'mongosh',
    description: 'Mở shell tương tác mongosh mới',
    category: 'MongoDB'
  },
  {
    id: 'mongo-rs-status',
    title: 'Kiểm tra Replica Set',
    command: 'mongosh --eval "rs.status()"',
    description: 'Xem trạng thái phân mảnh và replication cụm replica',
    category: 'MongoDB'
  },
  {
    id: 'mongo-dbs',
    title: 'Liệt kê danh sách DB',
    command: 'mongosh --eval "db.adminCommand({listDatabases: 1})"',
    description: 'Xem dung lượng và danh sách database',
    category: 'MongoDB'
  },
  {
    id: 'mongo-ops',
    title: 'Xem các tác vụ đang chạy',
    command: 'mongosh --eval "db.currentOp()"',
    description: 'Tìm các query chạy ngầm làm nghẽn DB',
    category: 'MongoDB'
  },

  // Redis
  {
    id: 'redis-cli',
    title: 'Mở Redis CLI',
    command: 'redis-cli',
    description: 'Khởi động command-line tool kết nối redis',
    category: 'Redis'
  },
  {
    id: 'redis-ping',
    title: 'Kiểm tra phản hồi (Ping)',
    command: 'redis-cli ping',
    description: 'Gửi gói tin ping kiểm tra kết nối',
    category: 'Redis'
  },
  {
    id: 'redis-info',
    title: 'Xem thông số hệ thống Redis',
    command: 'redis-cli info',
    description: 'Xem ram sử dụng, số lượng client kết nối, stats...',
    category: 'Redis'
  },
  {
    id: 'redis-monitor',
    title: 'Giám sát lệnh thời gian thực',
    command: 'redis-cli monitor',
    description: 'Xem trực tiếp mọi lệnh đang gửi tới Redis server',
    category: 'Redis'
  },
  {
    id: 'redis-keys',
    title: 'Tìm khóa dung lượng lớn (Bigkeys)',
    command: 'redis-cli --bigkeys',
    description: 'Tìm kiếm các key chiếm dụng tài nguyên lớn nhất',
    category: 'Redis'
  },

  // MySQL
  {
    id: 'mysql-cli',
    title: 'Kết nối MySQL shell',
    command: 'mysql -u root -p',
    description: 'Truy cập vào trình quản lý dòng lệnh MySQL',
    category: 'MySQL'
  },
  {
    id: 'mysql-replication',
    title: 'Kiểm tra trạng thái Replica',
    command: 'mysql -u root -p -e "SHOW REPLICA STATUS\\G"',
    description: 'Xem trạng thái đồng bộ Master-Slave trên Slave node',
    category: 'MySQL'
  },
  {
    id: 'mysql-processes',
    title: 'Xem danh sách tiến trình',
    command: 'mysql -u root -p -e "SHOW FULL PROCESSLIST;"',
    description: 'Xem các kết nối và câu lệnh đang thực thi',
    category: 'MySQL'
  },
  {
    id: 'mysql-innodb-status',
    title: 'Kiểm tra trạng thái InnoDB',
    command: 'mysql -u root -p -e "SHOW ENGINE INNODB STATUS\\G"',
    description: 'Xem chi tiết lock, transactions của InnoDB',
    category: 'MySQL'
  },

  // Vault
  {
    id: 'vault-status',
    title: 'Kiểm tra trạng thái Vault',
    command: 'vault status',
    description: 'Xem Vault đã unseal hay chưa, mode hoạt động',
    category: 'Vault'
  },
  {
    id: 'vault-init',
    title: 'Khởi tạo Vault Server',
    command: 'vault operator init',
    description: 'Tạo khóa master key và root token ban đầu',
    category: 'Vault'
  },
  {
    id: 'vault-unseal',
    title: 'Mở khóa Vault (Unseal)',
    command: 'vault operator unseal ',
    description: 'Nhập key share để unseal Vault',
    category: 'Vault'
  },
  {
    id: 'vault-secrets',
    title: 'Danh sách engine bí mật',
    command: 'vault secrets list',
    description: 'Liệt kê các backend lưu trữ thông tin nhạy cảm',
    category: 'Vault'
  },

  // GitLab
  {
    id: 'gitlab-status',
    title: 'Kiểm tra trạng thái dịch vụ',
    command: 'sudo gitlab-ctl status',
    description: 'Xem trạng thái puma, postgres, redis, sidekiq...',
    category: 'GitLab'
  },
  {
    id: 'gitlab-reconfig',
    title: 'Biên dịch lại cấu hình GitLab',
    command: 'sudo gitlab-ctl reconfigure',
    description: 'Áp dụng thay đổi cấu hình trong gitlab.rb',
    category: 'GitLab'
  },
  {
    id: 'gitlab-tail',
    title: 'Xem log thời gian thực',
    command: 'sudo gitlab-ctl tail',
    description: 'Theo dõi log của toàn bộ cụm dịch vụ GitLab',
    category: 'GitLab'
  },
  {
    id: 'gitlab-rails',
    title: 'Mở GitLab Rails Console',
    command: 'sudo gitlab-rails console',
    description: 'Mở môi trường tương tác rails điều khiển GitLab',
    category: 'GitLab'
  }
];

export const QuickCommandsPanel: React.FC<QuickCommandsPanelProps> = ({
  onExecute,
  onCopy,
  onClose,
  language = 'vi'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customCommands, setCustomCommands] = useState<QuickCommand[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Form states for adding custom command
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCommand, setNewCommand] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Custom');

  // Load custom commands from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('omni_custom_ssh_commands');
      if (stored) {
        setCustomCommands(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load custom commands', e);
    }
  }, []);

  // Save custom commands to localStorage
  const saveCustomCommands = (newCmds: QuickCommand[]) => {
    setCustomCommands(newCmds);
    localStorage.setItem('omni_custom_ssh_commands', JSON.stringify(newCmds));
  };

  const handleAddCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCommand.trim()) return;

    const newCmd: QuickCommand = {
      id: `custom-${Date.now()}`,
      title: newTitle.trim(),
      command: newCommand.trim(),
      description: newDesc.trim() || undefined,
      category: newCategory.trim() || 'Custom',
      isCustom: true
    };

    saveCustomCommands([...customCommands, newCmd]);
    setNewTitle('');
    setNewCommand('');
    setNewDesc('');
    setShowAddForm(false);
  };

  const handleDeleteCommand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(language === 'vi' ? 'Bạn có chắc chắn muốn xóa lệnh này không?' : 'Are you sure you want to delete this command?')) {
      const filtered = customCommands.filter(c => c.id !== id);
      saveCustomCommands(filtered);
    }
  };

  const allCommands = [...DEFAULT_COMMANDS, ...customCommands];

  // Get unique categories list
  const categories = Array.from(new Set(allCommands.map(cmd => cmd.category)));

  // Filter commands by search term and active category
  const filteredCommands = allCommands.filter(cmd => {
    const matchesSearch = cmd.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          cmd.command.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (cmd.description && cmd.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (activeCategory === 'All') return matchesSearch;
    if (activeCategory === 'Custom') return matchesSearch && cmd.isCustom;
    return matchesSearch && cmd.category === activeCategory;
  });

  const toggleExpand = (cat: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  // Group commands by category when viewing "All"
  const groupedCommands: Record<string, QuickCommand[]> = {};
  filteredCommands.forEach(cmd => {
    if (!groupedCommands[cmd.category]) {
      groupedCommands[cmd.category] = [];
    }
    groupedCommands[cmd.category].push(cmd);
  });

  const isVi = language === 'vi';

  return (
    <div style={{
      width: '320px',
      borderLeft: '1px solid var(--border-subtle)',
      backgroundColor: 'var(--bg-secondary)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      color: 'var(--text-main)',
      fontSize: '0.8rem',
      userSelect: 'none'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-tertiary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <Bookmark size={15} style={{ color: 'var(--accent-primary)' }} />
          <span>{isVi ? 'Thư Viện Lệnh Thường Dùng' : 'Common Commands'}</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            fontSize: '1rem',
            padding: '2px 6px'
          }}
          title={isVi ? 'Đóng bảng' : 'Close Panel'}
        >
          ✕
        </button>
      </div>

      {/* Search and Add action */}
      <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={14} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder={isVi ? 'Tìm kiếm lệnh...' : 'Search commands...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              padding: '6px 8px 6px 28px',
              color: 'var(--text-main)',
              fontSize: '0.78rem'
            }}
          />
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            width: '100%',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '4px',
            color: 'var(--accent-primary)',
            padding: '6px',
            cursor: 'pointer',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
        >
          <Plus size={14} />
          <span>{isVi ? 'Thêm lệnh tự định nghĩa' : 'Add Custom Command'}</span>
        </button>
      </div>

      {/* Add Custom Command Form */}
      {showAddForm && (
        <form onSubmit={handleAddCommand} style={{
          padding: '12px',
          backgroundColor: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
            {isVi ? 'THÊM LỆNH MỚI' : 'ADD NEW COMMAND'}
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>{isVi ? 'Tên lệnh / Tiêu đề' : 'Title'}</label>
            <input
              type="text"
              required
              placeholder={isVi ? 'Ví dụ: Check Logs Service' : 'e.g. Check Logs Service'}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
                padding: '4px 6px',
                color: 'var(--text-main)',
                fontSize: '0.75rem'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>{isVi ? 'Câu lệnh' : 'Command'}</label>
            <textarea
              required
              placeholder={isVi ? 'Ví dụ: tail -n 50 /var/log/my-app.log' : 'e.g. tail -n 50 /var/log/my-app.log'}
              value={newCommand}
              onChange={(e) => setNewCommand(e.target.value)}
              style={{
                width: '100%',
                height: '50px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
                padding: '4px 6px',
                color: 'var(--text-main)',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                resize: 'vertical'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>{isVi ? 'Mô tả ngắn' : 'Description'}</label>
              <input
                type="text"
                placeholder={isVi ? 'Mô tả tính năng' : 'Short description'}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '4px',
                  padding: '4px 6px',
                  color: 'var(--text-main)',
                  fontSize: '0.75rem'
                }}
              />
            </div>
            <div style={{ width: '100px' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>{isVi ? 'Phân loại' : 'Category'}</label>
              <input
                type="text"
                placeholder={isVi ? 'Custom' : 'Custom'}
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '4px',
                  padding: '4px 6px',
                  color: 'var(--text-main)',
                  fontSize: '0.75rem'
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignSelf: 'flex-end', marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
                color: 'var(--text-dim)',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '0.72rem'
              }}
            >
              {isVi ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: 'var(--accent-primary)',
                border: 'none',
                borderRadius: '4px',
                color: '#ffffff',
                padding: '4px 10px',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: 600
              }}
            >
              {isVi ? 'Lưu lại' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {/* Category Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '6px 10px',
        overflowX: 'auto',
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-tertiary)',
        whiteSpace: 'nowrap'
      }}>
        <button
          onClick={() => setActiveCategory('All')}
          style={{
            padding: '4px 8px',
            borderRadius: '12px',
            border: 'none',
            fontSize: '0.72rem',
            cursor: 'pointer',
            backgroundColor: activeCategory === 'All' ? 'var(--accent-primary)' : 'transparent',
            color: activeCategory === 'All' ? '#ffffff' : 'var(--text-dim)'
          }}
        >
          {isVi ? 'Tất cả' : 'All'}
        </button>
        <button
          onClick={() => setActiveCategory('Custom')}
          style={{
            padding: '4px 8px',
            borderRadius: '12px',
            border: 'none',
            fontSize: '0.72rem',
            cursor: 'pointer',
            backgroundColor: activeCategory === 'Custom' ? 'var(--accent-primary)' : 'transparent',
            color: activeCategory === 'Custom' ? '#ffffff' : 'var(--text-dim)'
          }}
        >
          {isVi ? '⭐ Tự định nghĩa' : '⭐ Custom'}
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '4px 8px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '0.72rem',
              cursor: 'pointer',
              backgroundColor: activeCategory === cat ? 'var(--accent-primary)' : 'transparent',
              color: activeCategory === cat ? '#ffffff' : 'var(--text-dim)'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Commands List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {filteredCommands.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '24px 0', color: 'var(--text-muted)' }}>
            <AlertCircle size={24} />
            <span>{isVi ? 'Không tìm thấy câu lệnh phù hợp' : 'No matching commands found'}</span>
          </div>
        ) : activeCategory !== 'All' ? (
          // Single category list
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredCommands.map(cmd => (
              <CommandItem
                key={cmd.id}
                cmd={cmd}
                onExecute={onExecute}
                onCopy={onCopy}
                onDelete={(id, e) => handleDeleteCommand(id, e)}
                isVi={isVi}
              />
            ))}
          </div>
        ) : (
          // Grouped category view
          Object.entries(groupedCommands).map(([categoryName, cmds]) => {
            const isExpanded = expandedCategories[categoryName] !== false;
            return (
              <div key={categoryName} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div
                  onClick={() => toggleExpand(categoryName)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 6px',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FolderOpen size={13} style={{ color: 'var(--accent-primary)' }} />
                    <span>{categoryName} ({cmds.length})</span>
                  </div>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>

                {isExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px', paddingLeft: '4px' }}>
                    {cmds.map(cmd => (
                      <CommandItem
                        key={cmd.id}
                        cmd={cmd}
                        onExecute={onExecute}
                        onCopy={onCopy}
                        onDelete={(id, e) => handleDeleteCommand(id, e)}
                        isVi={isVi}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

interface CommandItemProps {
  cmd: QuickCommand;
  onExecute: (command: string) => void;
  onCopy: (command: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  isVi: boolean;
}

const CommandItem: React.FC<CommandItemProps> = ({ cmd, onExecute, onCopy, onDelete, isVi }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy(cmd.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      padding: '8px',
      backgroundColor: 'var(--bg-tertiary)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '6px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      transition: 'border-color 0.2s',
      cursor: 'pointer'
    }}
    onClick={() => onExecute(cmd.command)}
    title={isVi ? 'Click để chạy trực tiếp lệnh này' : 'Click to run this command directly'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.78rem' }}>
          {cmd.title}
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {cmd.isCustom && (
            <button
              onClick={(e) => onDelete(cmd.id, e)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-danger)',
                cursor: 'pointer',
                padding: '2px',
                borderRadius: '4px'
              }}
              title={isVi ? 'Xóa lệnh' : 'Delete Command'}
            >
              <Trash2 size={12} />
            </button>
          )}
          <button
            onClick={handleCopyClick}
            style={{
              background: 'none',
              border: 'none',
              color: copied ? 'var(--accent-success)' : 'var(--text-dim)',
              cursor: 'pointer',
              padding: '2px',
              borderRadius: '4px'
            }}
            title={isVi ? 'Copy câu lệnh' : 'Copy Command'}
          >
            <Copy size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExecute(cmd.command);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-success)',
              cursor: 'pointer',
              padding: '2px',
              borderRadius: '4px'
            }}
            title={isVi ? 'Chạy lệnh' : 'Run Command'}
          >
            <Play size={12} />
          </button>
        </div>
      </div>

      <pre style={{
        margin: 0,
        padding: '6px',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '4px',
        color: 'var(--accent-primary)',
        fontFamily: 'monospace',
        fontSize: '0.72rem',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        border: '1px solid var(--border-subtle)'
      }}>
        {cmd.command}
      </pre>

      {cmd.description && (
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          {cmd.description}
        </span>
      )}
    </div>
  );
};
