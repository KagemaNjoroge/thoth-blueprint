# Test script to verify Django migration generation

from datetime import datetime
from src.lib.db import Diagram
from src.lib.types import AppNode, AppEdge, Column
from src.lib.codegen.django.migration_generator import generateDjangoMigrationString

# Create a test diagram that matches your examples
def create_test_diagram():
    # Create Category table
    category_columns = [
        {
            'id': 'cat_id',
            'name': 'id',
            'type': 'INT',
            'pk': True,
            'isAutoIncrement': True,
            'nullable': False
        },
        {
            'id': 'cat_name',
            'name': 'name',
            'type': 'VARCHAR',
            'length': 100,
            'nullable': False
        }
    ]
    
    category_node = {
        'id': 'category_node',
        'data': {
            'label': 'Category',
            'columns': category_columns,
            'indices': [],
            'comment': '',
            'color': '',
            'isDeleted': False,
            'order': 0
        }
    }
    
    # Create Post table
    post_columns = [
        {
            'id': 'post_id',
            'name': 'id',
            'type': 'INT',
            'pk': True,
            'isAutoIncrement': True,
            'nullable': False
        },
        {
            'id': 'post_title',
            'name': 'title',
            'type': 'VARCHAR',
            'length': 250,
            'nullable': False
        },
        {
            'id': 'post_excerpt',
            'name': 'excerpt',
            'type': 'TEXT',
            'nullable': True
        },
        {
            'id': 'post_category',
            'name': 'category',
            'type': 'INT',
            'nullable': False,
            'defaultValue': 1
        }
    ]
    
    post_node = {
        'id': 'post_node',
        'data': {
            'label': 'Post',
            'columns': post_columns,
            'indices': [],
            'comment': '',
            'color': '',
            'isDeleted': False,
            'order': 1
        }
    }
    
    # Create foreign key relationship
    fk_edge = {
        'id': 'fk_edge',
        'source': 'post_node',
        'target': 'category_node',
        'sourceHandle': 'post_category-source-right',
        'targetHandle': 'cat_id-target-left',
        'data': {
            'relationship': 'PROTECT'  # Django's PROTECT is equivalent to SQL's RESTRICT
        }
    }
    
    # Create diagram
    diagram = {
        'name': 'Test Diagram',
        'dbType': 'mysql',
        'data': {
            'nodes': [category_node, post_node],
            'edges': [fk_edge],
            'viewport': {'x': 0, 'y': 0, 'zoom': 1}
        },
        'createdAt': datetime.now(),
        'updatedAt': datetime.now()
    }
    
    return diagram

# Generate migration
if __name__ == "__main__":
    test_diagram = create_test_diagram()
    migration_string = generateDjangoMigrationString(test_diagram)
    print(migration_string)