import java.io.IOException;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * 类文件完整性自检（只读，不产出任何文件）。
 *
 * <p>用**真实的类加载器**逐个加载 {@code target/classes} 下的 class，借此发现
 * Maven 增量编译 + Lombok 产生的坏字节码：
 *
 * <pre>
 *   java.lang.ClassFormatError: Invalid method Code length 0
 *       in class file com/xupt/agent/Config/AgentLlmProperties
 * </pre>
 *
 * <p><b>为什么不能靠比对 md5 / jar 与 target/classes 是否一致？</b>
 * 那种比对只能证明两处「一致地坏」。字节码损坏必须真正加载才会暴露。
 *
 * <p>加载器只把 JDK 平台类作为父加载器，因此缺少第三方依赖时抛
 * {@code NoClassDefFoundError}（属于正常情况，忽略）；而字节码本身的损坏
 * 一定会抛 {@code ClassFormatError}（判定为失败）。
 *
 * <p>用法（JDK 11+ 单文件源码启动，无需编译）：
 * <pre>
 *   java deploy/tools/CheckClassFiles.java MediaMinds_java/agent-service/target/classes ...
 * </pre>
 *
 * <p>退出码：0 = 全部可加载；1 = 发现损坏；2 = 参数错误。
 */
public class CheckClassFiles {

    public static void main(String[] args) throws IOException {
        if (args.length == 0) {
            System.err.println("用法: java CheckClassFiles.java <classes 目录>...");
            System.exit(2);
        }

        int total = 0;
        List<String> corrupt = new ArrayList<>();
        List<String> tooNew = new ArrayList<>();

        for (String arg : args) {
            Path root = Paths.get(arg);
            if (!Files.isDirectory(root)) {
                continue;
            }

            List<Path> classFiles;
            try (Stream<Path> walk = Files.walk(root)) {
                classFiles = walk
                        .filter(p -> p.toString().endsWith(".class"))
                        .sorted()
                        .collect(Collectors.toList());
            }
            if (classFiles.isEmpty()) {
                continue;
            }

            ClassLoader loader = new URLClassLoader(
                    new URL[]{root.toUri().toURL()},
                    ClassLoader.getPlatformClassLoader());

            List<String> bad = new ArrayList<>();
            List<String> fresh = new ArrayList<>();

            for (Path cf : classFiles) {
                String name = root.relativize(cf).toString()
                        .replace(".class", "")
                        .replace('/', '.');
                try {
                    Class.forName(name, false, loader);
                } catch (UnsupportedClassVersionError e) {
                    fresh.add(name + "  →  编译版本高于当前 JDK：" + e.getMessage());
                } catch (ClassFormatError e) {
                    bad.add(name + "  →  " + e.getMessage());
                } catch (Throwable ignored) {
                    // NoClassDefFoundError / NoSuchMethodError 等：依赖缺失，不代表字节码损坏
                }
            }

            total += classFiles.size();
            if (bad.isEmpty() && fresh.isEmpty()) {
                System.out.printf("  ✔ %-46s %3d 个类全部可加载%n", label(arg), classFiles.size());
            } else {
                System.out.printf("  ✘ %-46s %3d 个类中 %d 个损坏%n",
                        label(arg), classFiles.size(), bad.size() + fresh.size());
                bad.forEach(b -> corrupt.add("       " + b));
                fresh.forEach(f -> tooNew.add("       " + f));
            }
        }

        System.out.println();
        if (corrupt.isEmpty() && tooNew.isEmpty()) {
            System.out.printf("  ✔ 共检查 %d 个类，未发现字节码损坏%n", total);
            System.exit(0);
        }

        System.out.printf("  ✘ 共检查 %d 个类，发现 %d 个问题：%n", total, corrupt.size() + tooNew.size());
        corrupt.forEach(System.out::println);
        tooNew.forEach(System.out::println);
        System.out.println();
        System.out.println("    修复：重新执行一次全量编译");
        System.out.println("      bash deploy/rebuild.sh backend          # 默认已带 clean");
        System.exit(1);
    }

    /** 把 .../xxx-service/target/classes 压缩成 xxx-service/target/classes */
    private static String label(String path) {
        String[] parts = path.split("/");
        for (int i = 0; i < parts.length; i++) {
            if (parts[i].equals("target") && i > 0) {
                return parts[i - 1] + "/target/classes";
            }
        }
        return path;
    }
}
