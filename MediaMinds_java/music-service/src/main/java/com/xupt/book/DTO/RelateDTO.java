package com.xupt.book.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@AllArgsConstructor
@NoArgsConstructor
public class RelateDTO {
    // 用户id
    private String userId;
    // 产品id
    private Integer productId;
    // 指数
    private Integer index;

}
