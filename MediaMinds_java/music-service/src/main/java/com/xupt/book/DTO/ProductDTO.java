package com.xupt.book.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProductDTO {

    private Integer productId;
    private String productName;
    private String productPrice;

    // 自定义构造方法，只传 productId
    public ProductDTO(Integer productId) {
        this.productId = productId;
    }
}
