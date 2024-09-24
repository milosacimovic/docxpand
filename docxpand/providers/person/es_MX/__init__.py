from collections import OrderedDict

from faker.providers.person.es_MX import Provider as PersonProvider


class Provider(PersonProvider):
    __use_weighting__ = True

    def parents_names(self) -> str:
        if self not in self.generator.providers:
            self.generator.add_provider(self)
        pattern: str = self.random_element(self.parents_names_format)
        return self.generator.parse(pattern)
