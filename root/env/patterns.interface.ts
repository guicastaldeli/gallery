export interface Patterns {
    patterns: {
        chamber: {
            base: {
                front: string[];
                back: string[];
                right: string[];
                left: string[];
                floor: string[];
                ceiling: string[];
            },
            fill: {
                front: string[];
                back: string[];
                right: string[];
                left: string[];
            }
        }
        ceiling: string[];
        ground: string[];
    }
}