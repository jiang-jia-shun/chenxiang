# 某家电企业库存成本构成异常分析 — BI 数据大屏

## 项目简介

基于《比赛数据.xlsx》对某家电企业 **2020 年至 2025 年 Q1** 期间库存成本构成异常进行分析与可视化展示。

## 技术栈

- **后端**: Spring Boot 3.2 / Java 17 / Maven
- **前端**: HTML5 + CSS3 + JavaScript + ECharts 5.5（CDN）
- **数据**: 纯静态 JSON，无数据库依赖

## 项目结构

```
bi-dashboard/
├── pom.xml                                  # Maven 配置
├── src/
│   └── main/
│       ├── java/com/bidashboard/
│       │   └── BiDashboardApplication.java  # Spring Boot 启动类
│       └── resources/
│           ├── application.properties        # 服务配置
│           └── static/                       # 静态资源（BI 大屏）
│               ├── index.html
│               ├── css/style.css
│               ├── js/dashboard.js
│               └── data/
│                   ├── dashboard-data.json   # 前端数据源
│                   └── analysis-debug.json   # 人工核验数据
├── scripts/
│   └── parse_excel.py                       # Excel → JSON 解析脚本
└── README.md
```

---

## 一、快速运行（两种方式）

### 方式 A：Spring Boot JAR（推荐）

**前提**: 安装 JDK 17+ 和 Maven 3.6+

```bash
# 1. 打包
cd bi-dashboard
mvn clean package -DskipTests

# 2. 运行
java -jar target/bi-dashboard.jar

# 3. 浏览器访问
# http://localhost:8080
```

### 方式 B：Python 本地服务器（无需 Java）

```bash
cd bi-dashboard
python -m http.server 8000
# 浏览器访问 http://localhost:8000
```

> 由于 `file://` 协议安全限制，不能直接双击 index.html。请使用上述任一方式启动本地服务器。

---

## 二、重新解析 Excel 数据

```bash
cd bi-dashboard
pip install openpyxl
python scripts/parse_excel.py
```

输出文件：
- `data/dashboard-data.json` — 前端大屏数据源
- `data/analysis-debug.json` — 人工核验计算过程

**注意**：打包 JAR 前请先运行解析脚本，并确保 `src/main/resources/static/data/` 下的 JSON 文件是最新的。

---

## 三、数据校验

### 异常识别逻辑

| 维度 | 公式 |
|------|------|
| 业务单元 | 规模标准化×0.40 + 占比标准化×0.25 + 增长率标准化×0.20 + 360天积压标准化×0.15 |
| 产品线 | 规模标准化×0.35 + 占比标准化×0.20 + 增长率标准化×0.20 + 高风险物料标准化×0.25 |
| 物料 | 金额标准化×0.40 + 库龄标准化×0.35 + 是否超360天×0.25 |

所有子项经 min-max 标准化，`analysis-debug.json` 包含完整计算过程。

### 数据文件说明

| 文件 | 内容 |
|------|------|
| `dashboard-data.json` | 21 季度成本趋势、4 业务单元、10 产品线、30 物料明细、KPI 指标 |
| `analysis-debug.json` | 原始工作表信息、KPI 计算公式、BU/PL/物料排名、各子项标准化得分 |

### 控制台校验

页面加载时在浏览器 Console 输出：
- JSON 加载状态
- KPI 完整性检查
- 图表数据长度
- 异常 BU/PL 计算结果
- NaN/空值告警

---

## 四、页面内容

### KPI 指标卡（6 个）
1. 总库存成本
2. 原材料成本
3. 原材料成本占比
4. 原材料成本环比增长
5. 360 天以上积压金额
6. 异常业务单元 / 异常产品线

### 分析模块（5 部分）
| 部分 | 内容 | 图表 |
|------|------|------|
| Part 1 | 总体异常识别 | 成本趋势折线图、结构堆叠图、占比趋势图 |
| Part 2 | 业务单元诊断 | 成本对比柱状图、占比对比图、气泡图 |
| Part 3 | 产品线诊断 | 成本排名图、分布环形图、重点产品趋势 |
| Part 4 | 物料与库龄诊断 | 风险排名图、散点图、库龄分布图、明细表 |
| Part 5 | 决策建议 | 采购优化、库存预警、销售协同、长期优化 |

---

## 五、Maven 打包命令

```bash
# 完整构建
mvn clean package

# 跳过测试
mvn clean package -DskipTests

# 运行 JAR
java -jar target/bi-dashboard.jar
```

JAR 文件包含所有静态资源（HTML/CSS/JS/JSON），无需外部依赖，可直接部署。

---

## 六、GitHub Actions 自动打包

如果本地没有 JDK/Maven，可通过 GitHub Actions 在线打包：

1. 将项目上传到 GitHub 仓库
2. 进入仓库 → **Actions** 标签页
3. 左侧选择 **Build JAR** → 点击 **Run workflow** → **Run workflow**
4. 等待构建完成，进入 workflow 详情页
5. 在 **Artifacts** 区域下载 **bi-dashboard-jar**
6. 解压后运行：

```bash
java -jar bi-dashboard.jar
```

配置文件：`.github/workflows/build-jar.yml`

- 触发方式：push 到 main/master 分支自动触发，也可手动触发
- JDK：Temurin 17
- 构建命令：`mvn clean package -DskipTests`
- Artifact：`target/bi-dashboard.jar`

---

## 七、数据来源

- 《比赛数据.xlsx》— 3 个工作表（库存成本趋势 / 物料库存明细 / 库存成本结构）
- 数据期间：2020 年 – 2025 年 Q1
- 所有 KPI、图表数据、分析结论均从 JSON 自动生成，未手工编造
